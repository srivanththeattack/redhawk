## Description

Please include a summary of the change and which issue is fixed. Include relevant motivation and context.

Fixes # (issue)

## Type of change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] This change requires a documentation update

## Platform impact

- [ ] Windows
- [ ] macOS
- [ ] Linux
- [ ] Cross-platform (all)

## How Has This Been Tested?

Please describe the tests that you ran to verify your changes.

- [ ] Test A
- [ ] Test B

**Test configuration**:
- OS: [e.g. Windows 11]
- Build: `npm run build` passes
- Package: `npm run package` produces correct platform output

## Checklist:

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation (if applicable)
- [ ] My changes generate no new warnings
- [ ] Any platform-specific logic uses `electron/services/platform.ts` rather than hardcoded OS checks
- [ ] New and existing build scripts pass
