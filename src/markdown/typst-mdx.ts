import { spawnSync } from 'node:child_process';
import { visit } from 'unist-util-visit';
import type { Root, RootContent } from 'mdast';
import { registerSyntax, type RemarkProcessor } from './mdx-syntax';
import { typstFromMarkdown, typstSyntax } from './typst-mdx-syntax';

const typstTemplate = `
    #set page(width: auto, height: auto, fill: none, margin: (
        top: 0em,
        bottom: 0em,
        left: 0.2em,
        right: 0.2em,
    ))

    #set text(fill: white, size: 18pt)
`

function typstCompile(mathContent: string, inline: boolean) {
    const typstCode = `
        ${typstTemplate}

        ${inline ? `$ ${mathContent} $` : `$\n${mathContent}\n$`}
    `

    const proc = spawnSync('typst', ["compile", "--format", "svg", "-", "-"], {
        input: typstCode,
        encoding: 'utf-8',
    })

    if (proc.error) {
        console.error('Failed to execute typst command! \n', proc.error)
        
        const { syscall, code } = <any> proc.error

        return {
            type: 'html',
            value: `<div class="md-typst-error">
                <p class="md-typst-error-message">Failed to execute typst command for inline typst math expression:</p>
                <pre class="md-typst-error-code">${mathContent}</pre>
                <pre class="md-typst-error-output">Failed to spawn typst process (${syscall} -> ${code})</pre>
            </div>`
        }
    }

    if (proc.status) {
        console.error('Typst compile failed! \n', proc.stderr)

        return {
            type: 'html',
            value: `<div class="md-typst-error">
                <p class="md-typst-error-message">Failed to compile inline typst math expression:</p>
                <pre class="md-typst-error-code">${mathContent}</pre>
                <pre class="md-typst-error-output">${proc.stderr}</pre>
            </div>`
        }
    }

    return {
        type: 'html',
        value: `
            <span class="md-typst-math-${inline ? 'inline' : 'block'}"> ${proc.stdout} </span>
        `
    }
}

export default function remarkTypstMdx(this: RemarkProcessor) {
    registerSyntax(this, typstSyntax(), typstFromMarkdown());

    return function (tree: Root) {
        visit(tree, ['typstInline', 'typstBlock'], (node, index, parent) => {
            if (parent && index !== undefined) {
                parent.children[index] = typstCompile(node.value, node.type === 'typstInline') as RootContent;
            }
        });
    };
}
