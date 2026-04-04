import { spawnSync } from 'node:child_process';
import { visit } from 'unist-util-visit';
import { findAndReplace } from 'mdast-util-find-and-replace';
import type { Nodes } from 'mdast';

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
                <pre class="md-typst-error-output"><code>Failed to spawn typst process (${syscall} -> ${code})</code></pre>
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
                <pre class="md-typst-error-output"><code>${proc.stderr}</code></pre>
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

export default function remarkTypstMath() {
    return function (tree: Nodes) {
        findAndReplace(tree, [
            [ 
                /\$([^$]+?)\$/g,
                <any> function (match: any, mathContent: any) {
                    if (match.startsWith('$\n') || match.startsWith('$\r\n')) {
                        return match // Skip block math, handled separately
                    }

                    return typstCompile(mathContent, true)
                }
            ]
        ])

        visit(tree, 'paragraph', (node, index, parent) => {
            if (node.children[0].type !== 'text') {
                return
            }

            const text = node.children.reduce((acc, child) => {
                if (child.type === 'text') {
                    return acc + child.value + "\n";
                } else {
                    return acc
                }
            }, "").trim();
            
            if (!text.startsWith('$') || !text.endsWith('$')) {
                return;
            }

            const mathContent = text.slice(1, -1).trim()

            parent!.children[index!] = <any> typstCompile(mathContent, false)

        })
    }
}