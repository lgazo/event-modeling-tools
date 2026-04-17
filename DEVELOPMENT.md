# Release

Bump versions in all `package.json`s.

Write VS Code Extension [changelog](packages/vscode-extension/CHANGELOG.md)

Update notable features in both [Obsidian plugin](packages/obsidian-plugin/README.md) and [VS Code extension](packages/vscode-extension/README.md).

# Git

Commit notes are being used to track AI co-author.

Fetch them regularly.
```
git fetch origin refs/notes/commits:refs/notes/commits
```

Don't forget to push them after standard push.
```
git push origin refs/notes/commits
```
