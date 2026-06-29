export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'style', 'refactor', 'chore', 'docs', 'test']],
    'subject-max-length': [2, 'always', 50],
    'subject-case': [0],
  },
};
