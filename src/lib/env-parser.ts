export interface ParsedVariable {
    key: string
    value: string
}

export interface ParseError {
    line: number
    content: string
    error: string
}

export interface ParseResult {
    variables: ParsedVariable[]
    errors: ParseError[]
}

/**
 * Parses .env file content into key-value pairs
 * Supports:
 * - Standard KEY=value format
 * - Comments (lines starting with #)
 * - Empty lines
 * - Quoted values (single and double quotes)
 * - Multiline values (quoted)
 * - Validates key names (alphanumeric and underscores only)
 */
export function parseEnvContent(content: string): ParseResult {
    const variables: ParsedVariable[] = []
    const errors: ParseError[] = []
    const lines = content.split('\n')

    let i = 0
    while (i < lines.length) {
        const lineNumber = i + 1
        const line = lines[i].trim()

        // Skip empty lines and comments
        if (!line || line.startsWith('#')) {
            i++
            continue
        }

        // Find the first = sign
        const equalIndex = line.indexOf('=')
        if (equalIndex === -1) {
            errors.push({
                line: lineNumber,
                content: lines[i],
                error: 'Missing "=" separator'
            })
            i++
            continue
        }

        // Extract key
        const key = line.substring(0, equalIndex).trim()

        // Validate key format
        if (!key) {
            errors.push({
                line: lineNumber,
                content: lines[i],
                error: 'Empty key name'
            })
            i++
            continue
        }

        if (!/^[a-zA-Z0-9_]+$/.test(key)) {
            errors.push({
                line: lineNumber,
                content: lines[i],
                error: 'Invalid key format (only alphanumeric and underscores allowed)'
            })
            i++
            continue
        }

        // Extract value
        let value = line.substring(equalIndex + 1).trim()

        // Handle quoted values (including multiline)
        if ((value.startsWith('"') || value.startsWith("'"))) {
            const quote = value[0]
            value = value.substring(1)

            // Check if quote is closed on the same line
            const closeQuoteIndex = value.indexOf(quote)
            if (closeQuoteIndex !== -1) {
                // Single line quoted value
                value = value.substring(0, closeQuoteIndex)
            } else {
                // Multiline quoted value
                let multilineValue = value
                i++
                while (i < lines.length) {
                    const nextLine = lines[i]
                    const closeIndex = nextLine.indexOf(quote)
                    if (closeIndex !== -1) {
                        multilineValue += '\n' + nextLine.substring(0, closeIndex)
                        break
                    } else {
                        multilineValue += '\n' + nextLine
                    }
                    i++
                }
                value = multilineValue
            }
        }

        variables.push({
            key: key.toUpperCase(),
            value
        })

        i++
    }

    return { variables, errors }
}
