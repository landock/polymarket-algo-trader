# Ralph Wiggum Autonomous Coding Technique

This repository implements the **Ralph Wiggum Technique** - an autonomous coding loop where Claude iteratively works through a Product Requirements Document (PRD) until all features are complete.

## What is the Ralph Wiggum Technique?

Named after the Simpsons character, this technique allows Claude to work autonomously through multiple iterations. Rather than stopping after one attempt, Claude continuously refines and builds new features based on a structured PRD until completion.

## How It Works

1. **PRD-Driven Development**: Features are defined in `plans/prd.json`
2. **Autonomous Iterations**: Claude selects the highest priority feature each iteration
3. **Quality Checks**: Each iteration runs type checks and tests
4. **Progress Tracking**: Updates are logged to `progress.txt`
5. **Git Commits**: Each feature gets its own commit
6. **Completion Signal**: Loop exits when Claude outputs `<promise>COMPLETE</promise>`

## Quick Start

### 1. Review the PRD

Check what features are planned:
```bash
cat plans/prd.json
```

The PRD includes 10 features for v1.1.0:
- Order History View
- Export to CSV
- Price Alert Notifications
- Portfolio Dashboard
- Risk Management Settings
- Transaction Cost Analysis
- Limit Order Support
- Multi-Market Watchlist
- Performance Analytics
- Keyboard Shortcuts

### 2. Run the Autonomous Loop

Start with a small number of iterations (e.g., 5-10) to see how it works:

```bash
./ralph.sh 5
```

This will:
- Run Claude 5 times (or until PRD is complete)
- Each iteration picks a feature, implements it, tests it, and commits it
- Progress is logged to `progress.txt`

### 3. Monitor Progress

Watch the console output and check:
```bash
# See what Claude has been working on
cat progress.txt

# Check git commits
git log --oneline

# See which features are complete
grep -A2 '"status"' plans/prd.json
```

### 4. Continue if Needed

If the PRD isn't complete after max iterations:
```bash
./ralph.sh 10  # Run 10 more iterations
```

## Files Explained

### `ralph.sh`
The main autonomous loop script. Runs Claude iteratively with:
- `--permission-mode acceptEdits` - Auto-accepts file edits
- Instructions to work on one feature at a time
- Checks for the `<promise>COMPLETE</promise>` marker

### `plans/prd.json`
The Product Requirements Document containing:
- **Features**: Array of features to implement
- **Priority**: HIGH/MEDIUM/LOW
- **Status**: NOT_STARTED/IN_PROGRESS/COMPLETE
- **Acceptance Criteria**: What "done" looks like

### `progress.txt`
Iteration log where Claude records:
- Which feature was worked on
- What files were changed
- Any issues encountered
- Notes for the next iteration

## Customization

### Add Your Own Features

Edit `plans/prd.json`:
```json
{
  "id": "F011",
  "title": "Your Feature Name",
  "priority": "HIGH",
  "status": "NOT_STARTED",
  "description": "Clear description of what to build",
  "acceptance_criteria": [
    "Specific requirement 1",
    "Specific requirement 2"
  ],
  "estimated_complexity": "MEDIUM"
}
```

### Adjust Iteration Count

For quick testing:
```bash
./ralph.sh 3  # Just 3 iterations
```

For full autonomous runs:
```bash
./ralph.sh 50  # Up to 50 iterations
```

### Modify Instructions

Edit the prompt in `ralph.sh` to change Claude's behavior:
- Change type checking command
- Add additional validation steps
- Modify the completion criteria

## Safety Features

1. **Git Commits**: Each feature is committed separately, easy to rollback
2. **Type Checking**: Runs `bun run type-check` before committing
3. **Progress Logging**: Full audit trail in `progress.txt`
4. **Max Iterations**: Prevents infinite loops
5. **Explicit Completion**: Requires `<promise>COMPLETE</promise>` to exit

## Cost Considerations

Each iteration uses Claude API tokens. For a 10-feature PRD:
- ~5-15 iterations expected
- ~$2-10 estimated cost (depends on codebase size)
- Monitor your usage in the Anthropic Console

## Rollback

If something goes wrong:
```bash
# See recent commits
git log --oneline -10

# Rollback to before a specific commit
git reset --hard <commit-hash>

# Or rollback just the last commit
git reset --hard HEAD~1
```

## Best Practices

1. **Start Small**: Test with 3-5 iterations first
2. **Clear PRD**: More detailed acceptance criteria = better results
3. **Review Commits**: Check Claude's work after each batch
4. **Incremental**: Better to run multiple small batches than one huge run
5. **Monitor Progress**: Watch `progress.txt` to see Claude's reasoning

## Example Workflow

```bash
# 1. Review what needs to be built
cat plans/prd.json

# 2. Run first batch (5 iterations)
./ralph.sh 5

# 3. Review the changes
git log --oneline -5
cat progress.txt

# 4. Test the extension
bun run build
# Load in Chrome and test manually

# 5. Continue if more work needed
./ralph.sh 10

# 6. When complete, push to GitHub
git push origin main
```

## Troubleshooting

### "Command not found: claude"
Install Claude Code CLI:
```bash
bun add -g @anthropic-ai/claude-code
```

### "Permission denied: ./ralph.sh"
Make it executable:
```bash
chmod +x ralph.sh
```

### "ANTHROPIC_API_KEY not set"
Set your API key:
```bash
export ANTHROPIC_API_KEY='your-key-here'
```

### Iterations complete but PRD not done
Common reasons:
- Features were too complex for single iteration
- Type check failures blocked progress
- Increase max iterations and try again

## Learn More

- [Ralph Wiggum Technique Article](https://www.atcyrus.com/stories/ralph-wiggum-technique-claude-code-autonomous-loops)
- [Anthropic Autonomous Coding Quickstart](https://github.com/anthropics/claude-quickstarts/tree/main/autonomous-coding)
- [Claude Code Documentation](https://github.com/anthropics/claude-code)

---

**Ready to start?** Run `./ralph.sh 5` and watch Claude build your features autonomously!
