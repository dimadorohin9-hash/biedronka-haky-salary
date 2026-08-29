# Biedronka HAKY Salary — v0.6.0 Multi-User

Теперь сайт рассчитан на нескольких пользователей.

- Каждый регистрирует свой аккаунт.
- Каждый видит только свои смены и настройки благодаря Supabase RLS.
- У каждого свои ставки, цель и доплата за жильё.
- Добавлен профиль пользователя.
- Добавлена кнопка «Поделиться сайтом».
- Существующие данные v0.5 не удаляются.
- Исправлен tsconfig для актуального Next.js/TypeScript.

## Обновление v0.5 → v0.6

1. В Supabase SQL Editor выполни `supabase/migration-v0.6.sql`.
2. Обнови файлы проекта в GitHub из этого архива. `.env.local` не загружай.
3. Vercel автоматически создаст новый deployment.
4. Переменные Vercel остаются прежними:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
