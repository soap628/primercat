import { createNavigation } from 'next-intl/navigation';

export const { Link, redirect, usePathname, useRouter } = createNavigation({
  locales: ['zh', 'en'] as const,
  localePrefix: 'always',
});
