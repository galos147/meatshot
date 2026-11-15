# MEAT STOCK

מערכת פנימית לניהול חנות מפעל לבשר: מלאי לפי אצווה ומקרר, קופה עם FEFO ודרישת הכשר, קבלת סחורה, העברות, התראות תפוגה, ו-12 דוחות.

- **טכנולוגיה:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · shadcn/ui · Supabase (Postgres, Auth, Storage)
- **מסמך תכנון:** [`docs/design.md`](docs/design.md) · **סטטוס:** [`PROGRESS.md`](PROGRESS.md)

---

## דרישות

- Node.js 24 ומעלה
- Docker Desktop (מריץ את Supabase המקומי)

## התקנה ראשונה

```bash
npm install
npx supabase start          # מוריד ומפעיל את מסד הנתונים המקומי (בפעם הראשונה לוקח כמה דקות)
```

`supabase start` מדפיס בסוף את הכתובת והמפתחות. יוצרים קובץ `.env.local` לפי [`.env.example`](.env.example):

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY>
SUPABASE_SECRET_KEY=<SECRET_KEY>
```

(אפשר להציג אותם שוב בכל רגע עם `npx supabase status`.)

```bash
npm run seed:dev            # נתוני דוגמה + 3 משתמשי פיתוח (מקומי בלבד)
npm run dev                 # http://localhost:3000
```

משתמשי הפיתוח:

| תפקיד | אימייל | סיסמה |
|---|---|---|
| מנהל מערכת | admin@meatstock.local | Admin-12345 |
| איש מכירות | seller@meatstock.local | Seller-12345 |
| עובד מחסן | warehouse@meatstock.local | Store-12345 |

## הפעלה יומיומית

1. להפעיל את Docker Desktop.
2. `npx supabase start` ואז `npm run dev`.

הנתונים המקומיים נשמרים בין הפעלות. ממשק ניהול המסד (Supabase Studio): http://127.0.0.1:54323

איפוס מלא של הנתונים המקומיים: `npm run db:reset && npm run seed:dev`

### תקלות נפוצות

- **`ports are not available ... 54322`** בזמן `supabase start` – תהליך אחר תפס את הפורט לרגע. להריץ `npx supabase stop`, לחכות כחצי דקה, ואז `npx supabase start`.
- **העמוד הראשון נטען לאט ב-`npm run dev`** – תקין. שרת הפיתוח מקמפל כל מסך בכניסה הראשונה אליו (ההתחברות הראשונה יכולה לקחת ~10 שניות). ב-build לפרודקשן זה לא קורה.

## פקודות

| פקודה | מה היא עושה |
|---|---|
| `npm run dev` | שרת פיתוח |
| `npm run build` / `npm run start` | build לפרודקשן והרצה שלו |
| `npm run typecheck` · `npm run lint` | בדיקות סטטיות |
| `npm test` | בדיקות יחידה |
| `npm run test:integration` | בדיקות מול מסד הנתונים המקומי (מכירה במקביל, מלאי שלילי, RLS…) |
| `npm run test:e2e` | בדיקות Playwright בדפדפן אמיתי |
| `npm run db:reset` | מוחק את המסד המקומי ומריץ מחדש את כל ה-migrations |
| `npm run db:types` | מייצר מחדש את `src/types/database.ts` אחרי שינוי סכמה |
| `npm run seed:dev` | נתוני דוגמה (מקומי בלבד) |
| `npm run create-admin` | יוצר/מקדם מנהל מערכת |

> בדיקות האינטגרציה וה-E2E כותבות נתוני בדיקה למסד **המקומי**. אחריהן: `npm run db:reset && npm run seed:dev`.
> לפני `npm run test:e2e` בפעם הראשונה: `npx playwright install chromium`.

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) רץ על כל push ו-pull request: typecheck, lint, בדיקות יחידה, בדיקות אינטגרציה ו-E2E מול Supabase זמני שעולה בתוך ה-runner (ה-E2E רץ מול build פרודקשן). לא נדרשים סודות, והוא לא נוגע בפרודקשן.

---

## פריסה לפרודקשן

### 1. Supabase בענן

1. ליצור פרויקט ב-[supabase.com](https://supabase.com) ולשמור את סיסמת המסד.
2. לקשר ולהעלות את הסכמה:
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push --remote --dry-run     # לראות מה יעלה
   npx supabase db push --remote
   ```
   שימו לב: בלי `--remote` הפקודה פועלת על המסד **המקומי**.
3. ה-migrations מפעילים בעצמם את `pg_cron` (התראות כל שעה) ויוצרים את ה-buckets הפרטיים ב-Storage.
4. ב-Authentication → URL Configuration להגדיר את כתובת האתר כ-Site URL.

### 2. האפליקציה

האפליקציה היא Next.js רגיל עם רינדור בצד שרת (`npm run build` ואז `npm run start`), ואפשר לארח אותה בכל שירות שתומך ב-Next.js. משתני הסביבה הנדרשים:

| משתנה | הערה |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | כתובת הפרויקט בענן |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | מפתח ציבורי |
| `SUPABASE_SECRET_KEY` | **סודי** – משמש רק בשרת ליצירת משתמשים. לא לחשוף בדפדפן ולא לשמור ב-git |

שני המשתנים שמתחילים ב-`NEXT_PUBLIC_` נצרבים בזמן ה-build, ולכן חייבים להיות מוגדרים כבר בשלב ה-build ולא רק בזמן הריצה.

### 3. מנהל ראשון

עם משתני הסביבה של **הפרודקשן** בקובץ זמני (למשל `.env.production.local`, שאינו נשמר ב-git):

```bash
node --env-file=.env.production.local scripts/create-admin.mjs <email> <password> "<שם מלא>"
```

את שאר העובדים יוצרים מתוך המערכת, במסך "עובדים והרשאות". **לא** להריץ `seed:dev` מול פרודקשן.

---

## גיבוי

במסלול החינמי של Supabase אין גיבוי אוטומטי. [`.github/workflows/backup.yml`](.github/workflows/backup.yml) מגבה את המסד כל לילה (וגם ידנית דרך Actions → Run workflow) ושומר קובץ **מוצפן** כ-artifact פרטי למשך 30 יום.

להפעלה, להגדיר ב-GitHub (Settings → Secrets and variables → Actions):

| Secret | ערך |
|---|---|
| `SUPABASE_DB_URL` | מחרוזת החיבור של ה-**Session pooler** (Supabase → Connect). לא החיבור הישיר – ה-runners של GitHub עובדים ב-IPv4 בלבד |
| `BACKUP_PASSPHRASE` | סיסמה ארוכה ואקראית להצפנה. **לשמור עותק במקום בטוח** – בלעדיה אי אפשר לפתוח את הגיבוי |

מה נכלל: משתמשים, וכל הטבלאות (מלאי, אצוות, מכירות, יומן תנועות…).
מה **לא** נכלל: קבצים ב-Storage (סריקות תעודות הכשר, תמונות מוצרים) – אותם יש לגבות בנפרד.

מומלץ להוריד מדי פעם גיבוי ולשמור אותו גם מחוץ ל-GitHub, ולתרגל שחזור פעם אחת לפני שצריך אותו באמת.

### שחזור מגיבוי

1. להוריד את ה-artifact מ-Actions (קובץ `meat-stock-YYYY-MM-DD.tar.gz.gpg`).
2. לפענח ולחלץ:
   ```bash
   gpg --decrypt --output backup.tar.gz meat-stock-YYYY-MM-DD.tar.gz.gpg
   tar -xzf backup.tar.gz        # roles.sql, schema.sql, data.sql
   ```
3. ליצור פרויקט Supabase **חדש וריק** (לא להריץ עליו `db push`), ולשחזר אליו עם `psql`:
   ```bash
   psql --single-transaction --variable ON_ERROR_STOP=1 \
     --file roles.sql \
     --file schema.sql \
     --command 'SET session_replication_role = replica' \
     --file data.sql \
     --dbname "<connection string של הפרויקט החדש>"
   ```
   (`session_replication_role = replica` מנטרל טריגרים בזמן הטעינה – נדרש כי יומן התנועות חסום לעריכה.)
4. לעדכן את משתני הסביבה של האפליקציה לפרויקט החדש ולבצע build מחדש.

---

## עקרונות שכדאי להכיר לפני שנוגעים בקוד

- **המלאי נאכף במסד הנתונים**, לא בממשק: מלאי לא יכול להיות שלילי, מכירות במקביל ננעלות (`FOR UPDATE`), ויומן התנועות אינו ניתן לעריכה או מחיקה. כל שינוי מלאי עובר דרך פונקציות SQL אטומיות ב-`supabase/migrations/`.
- **הרשאות ב-3 שכבות:** RLS במסד, בדיקה ב-Server Actions, והסתרה בממשק.
- **שינויי סכמה** נעשים רק בקובץ migration חדש (לא לערוך קיימים), ואחריו `npm run db:types`.
- פונקציות עזר שמשמשות גם עמודי שרת וגם רכיבי לקוח צריכות לשבת ב-`src/lib/` – לא בקובץ `"use client"`.
- גרסת Next.js כאן חדשה ושונה ממה שמופיע ברוב המדריכים – ראו [`AGENTS.md`](AGENTS.md).
