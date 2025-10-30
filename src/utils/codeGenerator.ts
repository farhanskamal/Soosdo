import { Node, Connection } from '../types';

export interface CodeGenerationResult {
  code: string;
  language: string;
  filename: string;
  lineCount: number;
  timestamp: string;
  nodesAnalyzed: number;
  connectionsAnalyzed: number;
}

export function generateCodeFromFlowchart(
  nodes: Node[], 
  connections: Connection[], 
  language: string = 'python',
  boardName: string = 'Generated Program'
): CodeGenerationResult {
  // Sort nodes by their x position to maintain logical flow
  const sortedNodes = [...nodes].sort((a, b) => a.x - b.y);
  
  let code = '';
  let filename = '';

  if (language === 'python') {
    ({ code, filename } = generatePythonCode(sortedNodes, connections, boardName));
  } else if (language === 'javascript') {
    ({ code, filename } = generateJavaScriptCode(sortedNodes, connections, boardName));
  } else {
    ({ code, filename } = generateGenericCode(sortedNodes, connections, boardName));
  }

  return {
    code,
    language,
    filename,
    lineCount: code.split('\n').length,
    timestamp: new Date().toISOString(),
    nodesAnalyzed: nodes.length,
    connectionsAnalyzed: connections.length
  };
}

function generatePythonCode(nodes: Node[], connections: Connection[], boardName: string) {
  let code = '';
  let importSection = '';
  const functions: string[] = [];
  const mainLogic: string[] = [];
  let hasMainGuard = false;

  // Add shebang and docstring
  code += `#!/usr/bin/env python3
"""
Generated from Soodo Code Flowchart: ${boardName}
Nodes analyzed: ${nodes.length}
Generated on: ${new Date().toLocaleDateString()}
"""

`;

  // Process each node
  nodes.forEach((node, index) => {
    const nodeType = node.type;
    const text = node.text || '';

    switch (nodeType) {
      case 'start':
        if (text.toLowerCase() === 'start' || text.toLowerCase().includes('begin')) {
          mainLogic.push('# Program starts here');
          hasMainGuard = true;
        }
        mainLogic.push('');
        break;

      case 'process':
        if (text.includes('#')) {
          // Variable assignment
          const cleanText = text.replace('#', '').trim();
          mainLogic.push(`${cleanText}`);
          mainLogic.push('');
        } else if (text.toLowerCase().includes('login') || text.toLowerCase().includes('sign in')) {
          // Login function
          functions.push(`def user_login():
    """User authentication function"""
    try:
        print("=== User Login System ===")
        username = input("Enter username: ").strip()
        password = input("Enter password: ").strip()
        
        if not username or not password:
            print("Error: Username and password are required")
            return False
            
        if len(username) < 3:
            print("Error: Username must be at least 3 characters")
            return False
            
        # Simulate authentication check
        print(f"Authentication successful for user: {username}")
        return True
        
    except KeyboardInterrupt:
        print("\\nLogin cancelled by user")
        return False
    except Exception as e:
        print(f"Login error: {e}")
        return False`);
          mainLogic.push('# User login process');
          mainLogic.push('if user_login():');
          mainLogic.push('    print("Welcome to the system!")');
          mainLogic.push('else:');
          mainLogic.push('    print("Login failed. Please try again.")');
          mainLogic.push('');
        } else if (text.toLowerCase().includes('valid') || text.toLowerCase().includes('check')) {
          // Input validation
          functions.push(`def validate_input(input_text):
    """Validate user input"""
    if not input_text or len(input_text.strip()) == 0:
        return False, "Input cannot be empty"
    
    # Remove extra spaces
    cleaned_input = input_text.strip()
    
    if len(cleaned_input) < 3:
        return False, "Input must be at least 3 characters"
    
    # Additional validations can be added here
    return True, "Input is valid"`);
          mainLogic.push('# Input validation process');
          mainLogic.push('user_input = input("Enter data: ")');
          mainLogic.push('is_valid, message = validate_input(user_input)');
          mainLogic.push('if is_valid:');
          mainLogic.push('    print(f"✓ {message}")');
          mainLogic.push('else:');
          mainLogic.push('    print(f"✗ {message}")');
          mainLogic.push('');
        } else if (text.toLowerCase().includes('create') || text.toLowerCase().includes('account')) {
          // Account creation
          functions.push(`def create_account(username):
    """Create new user account"""
    try:
        print(f"Creating account for user: {username}")
        
        # Simulate account creation process
        account_data = {
            'username': username,
            'created_at': 'now',
            'status': 'active'
        }
        
        print(f"Account created successfully!")
        return True
        
    except Exception as e:
        print(f"Error creating account: {e}")
        return False`);
          importSection = 'import os\\n';
          mainLogic.push('# Account creation process');
          mainLogic.push('username = input("Enter new username: ")');
          mainLogic.push('account_created = create_account(username)');
          mainLogic.push('if account_created:');
          mainLogic.push('    print("Account creation completed successfully!")');
          mainLogic.push('else:');
          mainLogic.push('    print("Account creation failed!")');
          mainLogic.push('');
        } else {
          // Generic process
          const cleanText = text.replace(/\\n/g, ' ').trim();
          if (cleanText) {
            mainLogic.push(`# Process: ${cleanText}`);
            mainLogic.push(`print("Executing: ${cleanText}")`);
            mainLogic.push('');
          }
        }
        break;

      case 'decision':
        if (text.toLowerCase().includes('if') || text.toLowerCase().includes('user is')) {
          mainLogic.push('# Decision point - user validation');
          mainLogic.push('user_is_valid = True  # Replace with actual validation logic');
          mainLogic.push('if user_is_valid:');
          mainLogic.push('    print("✓ User validation successful")');
        } else if (text.toLowerCase().includes('true') || text.toLowerCase().includes('false')) {
          mainLogic.push('else:');
          mainLogic.push('    print("✗ Validation failed")');
        } else {
          mainLogic.push(`# Decision: ${text}`);
          mainLogic.push('# TODO: Implement decision logic');
          mainLogic.push('if condition_met:');
          mainLogic.push('    print("Condition satisfied")');
          mainLogic.push('else:');
          mainLogic.push('    print("Condition not met")');
        }
        mainLogic.push('');
        break;
    }
  });

  // Build complete program
  let fullCode = '';
  
  // Add imports
  if (importSection) {
    fullCode += importSection;
  }

  // Add functions
  if (functions.length > 0) {
    fullCode += '# === Function Definitions ===\\n';
    functions.forEach(func => {
      fullCode += func + '\\n\\n';
    });
  }

  // Add main logic
  if (mainLogic.length > 0) {
    fullCode += '# === Main Program Logic ===\\n';
    mainLogic.forEach(line => {
      fullCode += line + '\\n';
    });
  }

  // Add main guard
  if (hasMainGuard || mainLogic.length > 0) {
    fullCode += '\\n';
    fullCode += 'if __name__ == "__main__":\\n';
    fullCode += '    try:\\n';
    fullCode += '        print("\\n" + "="*50 + "\\n")\\n';
    fullCode += '        print(f"Executing: ${boardName}")\\n';
    fullCode += '        print("="*50 + "\\n")\\n';
    
    // Add main logic execution
    if (!hasMainGuard) {
      mainLogic.forEach(line => {
        if (line && !line.startsWith('#') && !line.includes('if __name__')) {
          const indentedLine = line.startsWith('if ') || line.startsWith('else:') || line.startsWith('    ') ? line : '    ' + line;
          fullCode += indentedLine + '\\n';
        }
      });
    }
    
    fullCode += '        print("\\n" + "="*50 + "\\n")\\n';
    fullCode += '        print("Program completed successfully!")\\n';
    fullCode += '    except KeyboardInterrupt:\\n';
    fullCode += '        print("\\nProgram interrupted by user")\\n';
    fullCode += '    except Exception as e:\\n';
    fullCode += '        print(f"Error: {e}")\\n';
  }

  // If no content, provide a comprehensive template
  if (fullCode.trim() === '') {
    fullCode = `def main():
    """Main program function - ${boardName}"""
    print("Hello from ${boardName}")
    print("This program was generated from your flowchart!")
    
    # TODO: Add your program logic here
    # 1. Add input handling
    # 2. Add processing logic  
    # 3. Add output functionality
    
    print("Program execution completed!")

if __name__ == "__main__":
    main()`;
  }

  const filename = `${boardName.replace(/[^a-zA-Z0-9]/g, '')}.py`;
  return { code: fullCode.trim(), filename };
}

function generateJavaScriptCode(nodes: Node[], connections: Connection[], boardName: string) {
  let code = '';
  const functions: string[] = [];
  const mainLogic: string[] = [];

  // Add header
  code += `// Generated from Soodo Code Flowchart: ${boardName}
// Nodes analyzed: ${nodes.length}
// Generated on: ${new Date().toLocaleDateString()}

`;

  // Process nodes
  nodes.forEach((node, index) => {
    const nodeType = node.type;
    const text = node.text || '';

    switch (nodeType) {
      case 'start':
        code += '// Program starts here\\n';
        mainLogic.push('console.log(`Executing: ${boardName}`);');
        break;

      case 'process':
        if (text.includes('#')) {
          const cleanText = text.replace('#', '').trim();
          mainLogic.push(`const ${cleanText};`);
        } else if (text.toLowerCase().includes('login')) {
          functions.push(`async function userLogin() {
    try {
        console.log('=== User Login System ===');
        const username = prompt('Enter username:')?.trim();
        const password = prompt('Enter password:')?.trim();
        
        if (!username || !password) {
            throw new Error('Username and password are required');
        }
        
        if (username.length < 3) {
            throw new Error('Username must be at least 3 characters');
        }
        
        console.log(\`Authentication successful for user: \${username}\`);
        return true;
        
    } catch (error) {
        console.error('Login error:', error.message);
        return false;
    }
}`);
          mainLogic.push('// User login process');
          mainLogic.push('const loginSuccess = await userLogin();');
          mainLogic.push('if (loginSuccess) {');
          mainLogic.push('    console.log("Welcome to the system!");');
          mainLogic.push('} else {');
          mainLogic.push('    console.log("Login failed. Please try again.");');
          mainLogic.push('}');
        } else {
          const cleanText = text.replace(/\\n/g, ' ');
          mainLogic.push(`// Process: ${cleanText}`);
          mainLogic.push(`console.log("Executing: ${cleanText}");`);
        }
        break;

      case 'decision':
        mainLogic.push(`// Decision: ${text}`);
        mainLogic.push('const condition = true; // Replace with actual condition');
        mainLogic.push('if (condition) {');
        mainLogic.push('    console.log("Condition true - proceeding");');
        mainLogic.push('} else {');
        mainLogic.push('    console.log("Condition false - handling alternative");');
        mainLogic.push('}');
        break;
    }
  });

  // Build complete program
  let fullCode = code;

  if (functions.length > 0) {
    fullCode += '// === Function Definitions ===\\n';
    functions.forEach(func => {
      fullCode += func + '\\n\\n';
    });
  }

  fullCode += '// === Main Program ===\\n';
  fullCode += '(async () => {\\n';
  fullCode += '    try {\\n';
  fullCode += '        console.log("\\n" + "=".repeat(50));\\n';
  mainLogic.forEach(line => {
    fullCode += '        ' + line + '\\n';
  });
  fullCode += '        console.log("=".repeat(50));\\n';
  fullCode += '        console.log("Program completed successfully!");\\n';
  fullCode += '    } catch (error) {\\n';
  fullCode += '        console.error("Error:", error.message);\\n';
  fullCode += '    }\\n';
  fullCode += '})();\\n';

  const filename = `${boardName.replace(/[^a-zA-Z0-9]/g, '')}.js`;
  return { code: fullCode.trim(), filename };
}

function generateGenericCode(nodes: Node[], connections: Connection[], boardName: string) {
  const code = `// Generated from Soodo Code Flowchart: ${boardName}
// This is a generic template - customize as needed

function main() {
    console.log("Executing: ${boardName}");
    
    // Process ${nodes.length} nodes from flowchart
    ${nodes.map((node, i) => 
      `console.log("Processing node ${i + 1}: ${node.text || 'Process'}");`
    ).join('\\n    ')}
    
    console.log("Program completed!");
}

main();`;
  
  const filename = `${boardName.replace(/[^a-zA-Z0-9]/g, '')}.txt`;
  return { code, filename };
}