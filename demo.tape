# VHS terminal recording — install VHS: https://github.com/charmbracelet/vhs
# Run: vhs demo.tape
# Output: demo.gif (for GitHub README hero)

Output demo.gif

Set Shell "bash"
Set FontSize 16
Set Width 900
Set Height 500
Set Theme "Catppuccin Latte"
Set Padding 20

# Show install
Type "npm install -g honeprompt"
Sleep 500ms
Enter
Sleep 2s

# Init a template
Type "honeprompt init linkedin-hooks -d demo-run"
Sleep 500ms
Enter
Sleep 2s

# CD into it
Type "cd demo-run"
Sleep 300ms
Enter
Sleep 500ms

# Run optimization
Type "honeprompt run --iterations 5"
Sleep 500ms
Enter

# Wait for the run to complete (adjust timing based on actual speed)
Sleep 30s

# Show the result
Type "cat .honeprompt/report.json | jq '.baselineScore, .finalScore, .improvement'"
Sleep 500ms
Enter
Sleep 3s
