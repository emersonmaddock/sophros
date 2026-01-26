# Repository Architecture
.
├── .github
│   └── workflows
├── .vscode
├── backend
│   ├── alembic
│   │   └── versions
│   ├── app
│   │   ├── api
│   │   │   └── endpoints
│   │   ├── core
│   │   ├── db
│   │   ├── models
│   │   ├── schemas
│   │   └── services
│   └── tests
├── docs
│   └── pdfs
└── frontend
    ├── app
    │   ├── (auth)
    │   ├── (tabs)
    │   └── onboarding
    ├── assets
    │   └── images
    ├── components
    │   └── ui
    ├── constants
    ├── contexts
    ├── hooks
    ├── scripts
    └── types

# Branching / Workflow Model

This project uses task branching with minimal long-lived feature or release branches. This means that each issue should be its own branch, and these branches will be reviewed and pull requested into the `main` branch.

Since our branches are short-lived task branches, their naming does not matter as much since they will quickly be subsumed into the `main` branch. Therefore, we do not have strong branch naming conventions, except for a few minor requirements:
1. Names should be lowercase and hyphen-separated, using only alphanumeric characters
2. Names should not use continuous (repeated) or trailing hyphens
3. Names should be descriptive of the task completed
(Inspired by https://medium.com/@abhay.pixolo/naming-conventions-for-git-branches-a-cheatsheet-8549feca2534)

Branch names are encouraged to use prefixes inspired by the convential commits standard (found here: https://www.conventionalcommits.org/en/v1.0.0/) for git commits. Git commits should follow the basic form of a convential commit, which is:
```
    <type>[optional scope]: <description>

    [optional body]

    [optional footer(s)]
```

We will only use one branch, the `main` branch which will be our current most up-to-date code. Releases may be represented by a branch off of the released `main` code, in which case the branch will be prefixed with `release\`. All other branches will be short-lived and pull requested into the `main` branch.

# Code Development & Review Policy

Pull requests will be used to merge all code into the `main` line. The basic development flow is:
1. The contributor picks up an issue and branches off of the `main` line
2. The contributor develops their solution to the issue on their local machine
3. The contributor pushes their branch to GitHub and starts a pull request into `main`. They should make sure that their branch is rebased to the version of the `main` branch that they are merging into. This can be done by running `git rebase main` while on the development branch
4. The pull request will be reviewed by the core development team within 3 days. Since we are a small team of 3, 2 developers from our team must examine the pull request in order for it to be approved for merging. In other words, the developer who is conducting the pull request needs at minimum one other developer to examine and approve the code before merging.
5. The pull request also must pass continuous integration checks. These are set up in GitHub actions to automatically run on a pull request and to disallow merging until all tests pass.
6. Once all conditions are met, the pull request can be merged
