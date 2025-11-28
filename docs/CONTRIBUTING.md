# Contributing to Roony

## Development Workflow

### Getting Started

1. Clone the repository:
```bash
git clone https://github.com/dylanwilson21/roony-governance.git
cd roony-governance
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

4. Set up database:
```bash
npm run db:migrate
npm run db:seed  # Optional: seed test data
```

5. Start development server:
```bash
npm run dev
```

### Code Standards

- **TypeScript**: Strict mode enabled, no `any` types
- **Formatting**: Prettier with default config
- **Linting**: ESLint with Next.js config
- **Commits**: Conventional commits format

### File Structure

Follow the established structure:
- `app/` - Next.js App Router pages and API routes
- `components/` - React components
- `lib/` - Core business logic
- `types/` - TypeScript type definitions
- `docs/` - Documentation

### Naming Conventions

- **Components**: PascalCase (e.g., `TransactionTable.tsx`)
- **Files**: kebab-case for non-components (e.g., `policy-engine.ts`)
- **Functions**: camelCase (e.g., `evaluatePolicy`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_ATTEMPTS`)
- **Types/Interfaces**: PascalCase (e.g., `PurchaseIntent`)

### Component Guidelines

- Keep components small and focused
- Use TypeScript for all components
- Extract reusable logic to hooks
- Use shadcn/ui components when possible
- Follow the design system (see `docs/UI_COMPONENTS.md`)

### API Route Guidelines

- Use Next.js App Router API routes
- Validate all inputs
- Return consistent error formats
- Log all requests for audit
- Use proper HTTP status codes

### Database Guidelines

- Use Drizzle ORM for all database access
- Write migrations for schema changes
- Never modify migrations after they're merged
- Use transactions for multi-step operations
- Index frequently queried columns

### Testing

- Write unit tests for business logic
- Write integration tests for API endpoints
- Test error cases, not just happy paths
- Aim for >80% code coverage

### Documentation

- Update relevant docs when adding features
- Add JSDoc comments for public functions
- Update CHANGELOG.md for user-facing changes
- Keep architecture docs current

## Pull Request Process

1. **Create a branch** from `main`:
```bash
git checkout -b feature/your-feature-name
```

2. **Make changes** following code standards

3. **Test your changes**:
```bash
npm run test
npm run lint
npm run type-check
```

4. **Update CHANGELOG.md** if needed

5. **Commit your changes**:
```bash
git add .
git commit -m "feat: add policy evaluation engine"
```

6. **Push and create PR**:
```bash
git push origin feature/your-feature-name
```

### PR Requirements

- [ ] Code follows style guidelines
- [ ] Tests pass
- [ ] TypeScript compiles without errors
- [ ] Documentation updated (if needed)
- [ ] CHANGELOG.md updated (if user-facing)

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

Example:
```
feat(policy-engine): add MCC filtering support

- Add merchant category code validation
- Update policy schema to include MCC rules
- Add tests for MCC filtering
```

## Development Tools

### Database Studio

View and edit database:
```bash
npm run db:studio
```

### Type Checking

Check TypeScript:
```bash
npm run type-check
```

### Linting

Lint code:
```bash
npm run lint
```

### Formatting

Format code:
```bash
npm run format
```

## Getting Help

- Check existing documentation in `docs/`
- Review existing code for patterns
- Ask questions in GitHub Discussions
- Open an issue for bugs

## Code Review Guidelines

### For Authors

- Keep PRs focused and small
- Provide context in PR description
- Respond to feedback promptly
- Update PR based on feedback

### For Reviewers

- Be constructive and respectful
- Focus on code, not the person
- Suggest improvements, don't just point out issues
- Approve when ready, don't wait for perfection

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md` with release notes
3. Create release branch: `release/v1.0.0`
4. Test thoroughly
5. Merge to `main`
6. Tag release: `git tag v1.0.0`
7. Push tags: `git push --tags`
8. Deploy to production

