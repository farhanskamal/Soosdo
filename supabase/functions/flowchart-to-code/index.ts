Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const { nodes, connections, language = 'python', boardName = 'Generated Program' } = await req.json();

        if (!nodes || nodes.length === 0) {
            throw new Error('Flowchart data is required');
        }

        // Translate flowchart to code logic
        const generatedCode = await generateCodeFromFlowchart(nodes, connections, language, boardName);

        return new Response(JSON.stringify({
            data: {
                code: generatedCode.code,
                language: generatedCode.language,
                filename: generatedCode.filename,
                lineCount: generatedCode.code.split('\n').length,
                timestamp: new Date().toISOString(),
                nodesAnalyzed: nodes.length,
                connectionsAnalyzed: connections.length
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Flowchart-to-code error:', error);

        const errorResponse = {
            error: {
                code: 'CODE_GENERATION_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

async function generateCodeFromFlowchart(nodes: any[], connections: any[], language: string, boardName: string) {
    // Sort nodes by their x position to maintain logical flow
    const sortedNodes = [...nodes].sort((a, b) => a.x - b.x);
    
    let code = '';
    let filename = '';

    if (language === 'python') {
        ({ code, filename } = generatePythonCode(sortedNodes, connections, boardName));
    } else if (language === 'javascript') {
        ({ code, filename } = generateJavaScriptCode(sortedNodes, connections, boardName));
    } else {
        throw new Error(`Unsupported language: ${language}`);
    }

    return { code, language, filename };
}

function generatePythonCode(nodes: any[], connections: any[], boardName: string) {
    let code = '';
    let hasMainGuard = false;
    let importSection = '';
    const functions: string[] = [];
    const mainLogic: string[] = [];

    // Process each node
    nodes.forEach((node, index) => {
        const nodeType = node.type;
        const text = node.text || '';

        switch (nodeType) {
            case 'start':
                if (text.toLowerCase() === 'start') {
                    code += '# Program starts here\n';
                    mainLogic.push('# Main program execution begins');
                    mainLogic.push('');
                    hasMainGuard = true;
                }
                break;

            case 'process':
                if (text.includes('#')) {
                    // Variable assignment
                    const cleanText = text.replace('#', '').trim();
                    mainLogic.push(`${cleanText}`);
                    mainLogic.push('');
                } else if (text.toLowerCase().includes('login') || text.toLowerCase().includes('sign in')) {
                    functions.push(`def user_login():
    """User authentication function"""
    username = input("Enter username: ")
    password = input("Enter password: ")
    
    # Basic validation
    if username and password:
        print("Login successful")
        return True
    else:
        print("Invalid credentials")
        return False`);
                    mainLogic.push('# User login process');
                    mainLogic.push('user_login()');
                    mainLogic.push('');
                } else if (text.toLowerCase().includes('valid') || text.toLowerCase().includes('check')) {
                    functions.push(`def validate_input(input_text):
    """Validate user input"""
    if not input_text or len(input_text.strip()) == 0:
        return False, "Input cannot be empty"
    if len(input_text.strip()) < 3:
        return False, "Input must be at least 3 characters"
    return True, "Input is valid"`);
                    mainLogic.push('# Input validation');
                    mainLogic.push('validation_result = validate_input(user_input)');
                    mainLogic.push('');
                } else if (text.toLowerCase().includes('create') || text.toLowerCase().includes('account')) {
                    functions.push(`def create_account(username):
    """Create new user account"""
    try:
        # Simulate account creation logic
        print(f"Creating account for user: {username}")
        return True
    except Exception as e:
        print(f"Error creating account: {e}")
        return False`);
                    mainLogic.push('# Account creation process');
                    mainLogic.push('account_created = create_account(username)');
                    mainLogic.push('');
                } else {
                    // Generic process
                    const cleanText = text.replace(/\n/g, ' ');
                    mainLogic.push(`# Process: ${cleanText}`);
                    mainLogic.push(`# TODO: Implement ${cleanText}`);
                    mainLogic.push('');
                }
                break;

            case 'decision':
                if (text.toLowerCase().includes('if') || text.toLowerCase().includes('user is')) {
                    mainLogic.push('# Decision point');
                    mainLogic.push('if user_is_valid:');
                    mainLogic.push('    # User validation passed');
                    mainLogic.push('    print("User validation successful")');
                } else if (text.toLowerCase().includes('true') || text.toLowerCase().includes('false')) {
                    mainLogic.push('else:');
                    mainLogic.push('    # Handle false case');
                    mainLogic.push('    print("Validation failed")');
                } else {
                    mainLogic.push(`# Decision: ${text}`);
                    mainLogic.push('# TODO: Implement decision logic');
                }
                mainLogic.push('');
                break;
        }
    });

    // Build complete program
    let fullCode = '';
    
    // Add imports if needed
    if (functions.length > 0 || mainLogic.some(line => line.includes('input('))) {
        importSection = 'import sys\nimport json\n';
    }

    // Add functions
    if (functions.length > 0) {
        fullCode += importSection;
        fullCode += '\n# Function definitions\n';
        functions.forEach(func => {
            fullCode += func + '\n\n';
        });
    }

    // Add main logic
    if (mainLogic.length > 0) {
        fullCode += '# Main program logic\n';
        mainLogic.forEach(line => {
            fullCode += line + '\n';
        });
        fullCode += '\n';
    }

    // Add main guard if not already present
    if (hasMainGuard && !fullCode.includes('if __name__ == "__main__":')) {
        fullCode += 'if __name__ == "__main__":\n';
        fullCode += '    main()\n';
    }

    // If no content, provide a template
    if (fullCode.trim() === '') {
        fullCode = `def main():
    """Main program function"""
    print("Hello from ${boardName}")
    # TODO: Add your program logic here

if __name__ == "__main__":
    main()`;
    }

    const filename = `${boardName.replace(/[^a-zA-Z0-9]/g, '')}.py`;
    return { code: fullCode.trim(), filename };
}

function generateJavaScriptCode(nodes: any[], connections: any[], boardName: string) {
    let code = '';
    const functions = [];
    const mainLogic = [];

    // Process each node
    nodes.forEach((node, index) => {
        const nodeType = node.type;
        const text = node.text || '';

        switch (nodeType) {
            case 'start':
                code += '// Program starts here\n';
                mainLogic.push('console.log("Program execution started");\n');
                break;

            case 'process':
                if (text.includes('#')) {
                    // Variable assignment
                    const cleanText = text.replace('#', '').trim();
                    mainLogic.push(`const ${cleanText};\n`);
                } else if (text.toLowerCase().includes('login')) {
                    functions.push(`function userLogin() {
    return new Promise((resolve, reject) => {
        const username = prompt("Enter username:");
        const password = prompt("Enter password:");
        
        if (username && password) {
            console.log("Login successful");
            resolve(true);
        } else {
            reject(new Error("Invalid credentials"));
        }
    });
}`);
                    mainLogic.push('// User login process\n');
                    mainLogic.push('await userLogin();\n');
                } else {
                    const cleanText = text.replace(/\n/g, ' ');
                    mainLogic.push(`// Process: ${cleanText}\n`);
                    mainLogic.push(`// TODO: Implement ${cleanText}\n`);
                }
                break;

            case 'decision':
                mainLogic.push(`// Decision: ${text}\n`);
                mainLogic.push('if (condition) {\n');
                mainLogic.push('    console.log("Condition true");\n');
                mainLogic.push('} else {\n');
                mainLogic.push('    console.log("Condition false");\n');
                mainLogic.push('}\n');
                break;
        }
    });

    // Build complete program
    let fullCode = '';

    // Add functions
    if (functions.length > 0) {
        functions.forEach(func => {
            fullCode += func + '\n\n';
        });
    }

    // Add main logic
    fullCode += '// Main program\n';
    fullCode += '(async () => {\n';
    mainLogic.forEach(line => {
        fullCode += '    ' + line;
    });
    fullCode += '})();\n';

    // If no content, provide a template
    if (fullCode.trim() === '// Main program\n(async () => {\n\n})();') {
        fullCode = `console.log("Hello from ${boardName}");
// TODO: Add your program logic here`;
    }

    const filename = `${boardName.replace(/[^a-zA-Z0-9]/g, '')}.js`;
    return { code: fullCode.trim(), filename };
}