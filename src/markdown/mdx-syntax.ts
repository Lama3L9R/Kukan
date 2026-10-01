import type { remark } from 'remark';
import type { Extension as SyntaxExtension } from 'micromark-util-types';
import type { Extension as AstExtension } from 'mdast-util-from-markdown';
import type { MdxTextExpression } from 'mdast-util-mdx-expression';

export type RemarkProcessor = ReturnType<typeof remark>;

export function registerSyntax(processor: RemarkProcessor, syntax: SyntaxExtension, ast: AstExtension) {
    const data = processor.data() as {
        micromarkExtensions?: SyntaxExtension[];
        fromMarkdownExtensions?: AstExtension[];
    };
    (data.micromarkExtensions ??= []).push(syntax);
    (data.fromMarkdownExtensions ??= []).push(ast);
}

export function isLineEnding(code: number | null) {
    return code === -5 || code === -4 || code === -3;
}

export function isSpace(code: number | null) {
    return code === 32 || code === -2 || code === -1;
}

// Build an expression AST containing a literal, without parsing the raw body as JS.
export function stringExpression(value: string): MdxTextExpression {
    return {
        type: 'mdxTextExpression',
        value: JSON.stringify(value),
        data: {
            estree: {
                type: 'Program',
                sourceType: 'module',
                body: [{ type: 'ExpressionStatement', expression: { type: 'Literal', value } }],
            },
        },
    };
}
