import type { Construct, Extension } from 'micromark-util-types';
import type { Extension as AstExtension } from 'mdast-util-from-markdown';
import type { Literal } from 'mdast';
import { isLineEnding, isSpace } from './mdx-syntax';

interface TypstInline extends Literal { type: 'typstInline' }
interface TypstBlock extends Literal { type: 'typstBlock' }

declare module 'mdast' {
    interface PhrasingContentMap { typstInline: TypstInline }
    interface BlockContentMap { typstBlock: TypstBlock }
}

declare module 'micromark-util-types' {
    interface TokenTypeMap {
        typstInline: 'typstInline';
        typstBlock: 'typstBlock';
        typstFence: 'typstFence';
        typstValue: 'typstValue';
    }
}

const inline: Construct = {
    name: 'typstInline',
    tokenize(effects, ok, nok) {
        let hasContent = false;
        return start;

        function start(code: number | null) {
            effects.enter('typstInline');
            effects.enter('typstFence');
            effects.consume(code);
            effects.exit('typstFence');
            effects.enter('typstValue');
            return body;
        }

        function body(code: number | null) {
            if (code === null || isLineEnding(code)) return nok(code);
            if (code === 36) {
                if (!hasContent) return nok(code);
                effects.exit('typstValue');
                effects.enter('typstFence');
                effects.consume(code);
                effects.exit('typstFence');
                effects.exit('typstInline');
                return ok;
            }
            hasContent = true;
            effects.consume(code);
            return code === 92 ? escaped : body;
        }

        function escaped(code: number | null) {
            if (code === null || isLineEnding(code)) return nok(code);
            effects.consume(code);
            return body;
        }
    },
};

const block: Construct = {
    name: 'typstBlock',
    concrete: true,
    tokenize(effects, ok, nok) {
        const self = this;
        const startPosition = self.now();
        let fenceSize = 0;

        function start(code: number | null) {
            effects.enter('typstBlock');
            effects.enter('typstFence');
            return openingFence(code);
        }

        function openingFence(code: number | null) {
            if (code === 36) {
                fenceSize++;
                effects.consume(code);
                return openingFence;
            }
            return openingSpace(code);
        }

        function openingSpace(code: number | null) {
            if (isSpace(code)) {
                effects.consume(code);
                return openingSpace;
            }
            if (!isLineEnding(code)) return nok(code);
            if (self.interrupt) {
                effects.exit('typstFence');
                effects.exit('typstBlock');
                return ok(code);
            }
            effects.enter('lineEnding');
            effects.consume(code);
            effects.exit('lineEnding');
            effects.exit('typstFence');
            effects.enter('typstValue');
            return lineStart;
        }

        function lineStart(code: number | null) {
            return effects.check(closingFence, beforeClosing, body)(code);
        }

        function body(code: number | null) {
            if (code === null) {
                throw new Error(`Missing closing ${'$'.repeat(fenceSize)} for Typst block at ${startPosition.line}:${startPosition.column}`);
            }
            if (isLineEnding(code)) effects.enter('lineEnding');
            effects.consume(code);
            if (isLineEnding(code)) effects.exit('lineEnding');
            return isLineEnding(code) ? lineStart : body;
        }

        function beforeClosing(code: number | null) {
            effects.exit('typstValue');
            return effects.attempt(closingFence, finish, nok)(code);
        }

        function finish(code: number | null) {
            effects.exit('typstBlock');
            return ok(code);
        }

        const closingFence: Construct = {
            partial: true,
            tokenize(effects, ok, nok) {
                let size = 0;
                return indent;

                function indent(code: number | null) {
                    effects.enter('typstFence');
                    return beforeSequence(code);
                }

                function beforeSequence(code: number | null) {
                    if (isSpace(code)) {
                        effects.consume(code);
                        return beforeSequence;
                    }
                    return sequence(code);
                }

                function sequence(code: number | null) {
                    if (code === 36) {
                        size++;
                        effects.consume(code);
                        return sequence;
                    }
                    if (size !== fenceSize) return nok(code);
                    return trailingSpace(code);
                }

                function trailingSpace(code: number | null) {
                    if (isSpace(code)) {
                        effects.consume(code);
                        return trailingSpace;
                    }
                    if (code !== null && !isLineEnding(code)) return nok(code);
                    effects.exit('typstFence');
                    return ok(code);
                }
            },
        };
        return start;
    },
};

export function typstSyntax(): Extension {
    return { text: { 36: inline }, flow: { 36: block } };
}

export function typstFromMarkdown(): AstExtension {
    return {
        enter: {
            typstInline(token) { this.enter({ type: 'typstInline', value: '' }, token); },
            typstBlock(token) { this.enter({ type: 'typstBlock', value: '' }, token); },
        },
        exit: {
            typstValue(token) {
                const node = this.stack[this.stack.length - 1] as TypstInline | TypstBlock;
                node.value = this.sliceSerialize(token);
            },
            typstInline(token) { this.exit(token); },
            typstBlock(token) { this.exit(token); },
        },
    };
}
