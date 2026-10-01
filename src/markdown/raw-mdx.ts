import * as acorn from 'acorn';
import { mdxJsx } from 'micromark-extension-mdx-jsx';
import type { Construct, TokenType } from 'micromark-util-types';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';
import { isLineEnding, isSpace, registerSyntax, stringExpression, type RemarkProcessor } from './mdx-syntax';

declare module 'micromark-util-types' {
    interface TokenTypeMap {
        mdxRawValue: 'mdxRawValue';
        mdxRawClosing: 'mdxRawClosing';
    }
}

// Reuse MDX's attribute parser. Only the body of Script/Style is opaque.
const jsx = mdxJsx({ acorn, addResult: true });
const jsxTag: Construct = { ...(jsx.text![60] as Construct), name: undefined, partial: true };

function rawElement(flow: boolean): Construct {
    return {
        name: flow ? 'mdxRawFlow' : 'mdxRawText',
        concrete: flow,
        resolve(events) {
            if (flow) {
                for (const [, token] of events) {
                    if (token.type.startsWith('mdxJsxTextTag')) {
                        token.type = token.type.replace('mdxJsxTextTag', 'mdxJsxFlowTag') as TokenType;
                    }
                }
            }
            return events;
        },
        tokenize(effects, ok, nok) {
            const self = this;
            const start = self.now();
            const eventStart = self.events.length;
            let name: 'Script' | 'Style';

            return effects.attempt(jsxTag, afterOpening, nok);

            function afterOpening(code: number | null) {
                const openingEvents = self.events.slice(eventStart);
                const nameToken = openingEvents.find(([kind, token]) =>
                    kind === 'enter' && token.type === 'mdxJsxTextTagNamePrimary'
                )?.[1];
                const tagName = nameToken && self.sliceSerialize(nameToken);
                const closing = openingEvents.some(([, token]) => token.type === 'mdxJsxTextTagClosingMarker');
                const qualified = openingEvents.some(([, token]) =>
                    token.type === 'mdxJsxTextTagNameMemberMarker' || token.type === 'mdxJsxTextTagNamePrefixMarker'
                );

                if (closing || qualified || (tagName !== 'Script' && tagName !== 'Style')) return nok(code);
                name = tagName;

                if (self.interrupt || openingEvents.some(([, token]) => token.type === 'mdxJsxTextTagSelfClosingMarker')) {
                    return finish(code);
                }

                effects.enter('mdxRawValue');
                return body(code);
            }

            function body(code: number | null) {
                if (code === null) {
                    throw new Error(`Missing </${name}> for raw <${name}> at ${start.line}:${start.column}`);
                }
                if (code === 60) {
                    return effects.check(closingTag(), beforeClosing, consumeBody)(code);
                }
                return consumeBody(code);
            }

            function consumeBody(code: number | null) {
                if (isLineEnding(code)) effects.enter('lineEnding');
                effects.consume(code);
                if (isLineEnding(code)) effects.exit('lineEnding');
                return body;
            }

            function beforeClosing(code: number | null) {
                effects.exit('mdxRawValue');
                return effects.attempt(jsxTag, finish, nok)(code);
            }

            function finish(code: number | null) {
                if (!flow) return ok(code);
                if (isSpace(code)) {
                    effects.enter('whitespace');
                    return trailingSpace(code);
                }
                return code === null || isLineEnding(code) ? ok(code) : nok(code);
            }

            function trailingSpace(code: number | null) {
                if (isSpace(code)) {
                    effects.consume(code);
                    return trailingSpace;
                }
                effects.exit('whitespace');
                return finish(code);
            }

            function closingTag(): Construct {
                return {
                    partial: true,
                    tokenize(effects, ok, nok) {
                        const marker = `</${name}`;
                        let index = 0;
                        return match;

                        function match(code: number | null) {
                            if (index === 0) effects.enter('mdxRawClosing');
                            if (code !== marker.charCodeAt(index)) return nok(code);
                            effects.consume(code);
                            index++;
                            return index === marker.length ? end : match;
                        }

                        function end(code: number | null) {
                            if (isSpace(code) || isLineEnding(code)) {
                                effects.consume(code);
                                return end;
                            }
                            if (code !== 62) return nok(code);
                            effects.consume(code);
                            effects.exit('mdxRawClosing');
                            return ok;
                        }
                    },
                };
            }
        },
    };
}

export default function remarkRawMdx(this: RemarkProcessor) {
    registerSyntax(this, {
        flow: { 60: rawElement(true) },
        text: { 60: rawElement(false) },
    }, {
        canContainEols: ['mdxJsxTextElement'],
        enter: {
            mdxRawValue() { this.buffer(); },
        },
        exit: {
            mdxRawValue(token) {
                this.resume();
                const node = this.stack[this.stack.length - 1] as MdxJsxFlowElement | MdxJsxTextElement;
                node.children.push(stringExpression(this.sliceSerialize(token)));
            },
        },
    });

    return function (tree: Root) {
        visit(tree, ['mdxJsxFlowElement', 'mdxJsxTextElement'], (node) => {
            if (node.name === 'Script') node.name = 'script';
            else if (node.name === 'Style') node.name = 'style';
        });
    };
}
