# FindRec TO — Data Analysis Queries

> Supabase SQL queries for exploring the drop-in and program data.
> Run these in the Supabase dashboard → SQL Editor.

---

## 1. Activity Types Overview

**What it does:** Returns every top-level activity category (skating, fitness, aquatics, etc.) with a session count. Use this to understand the full breadth of activities in the `dropins` table and spot any unexpected or null values.

```sql
SELECT DISTINCT activity_type, COUNT(*) AS session_count
FROM dropins
GROUP BY activity_type
ORDER BY session_count DESC;
```

---

## 2. Skating Drop-ins with Location Info (Today Onward)

**What it does:** Joins `dropins` with `locations` and filters to skating sessions on or after today. Useful for verifying the search results that `/api/dropin-search` returns and for spot-checking data quality (missing addresses, wrong districts, etc.).

```sql
SELECT
  d.course_title,
  d.first_date,
  d.start_time,
  d.end_time,
  d.day_of_week,
  l.name    AS location_name,
  l.address,
  l.district
FROM dropins d
JOIN locations l ON l.id = d.location_id
WHERE d.activity_type ILIKE '%skating%'
  AND d.first_date >= CURRENT_DATE
ORDER BY d.first_date, d.start_time;
```

---

## 3. Activity Types Across Drop-ins AND Programs

**What it does:** Unions both the `dropins` and `programs` tables to show every activity type and which source it comes from. Helps confirm that `activityTypeColor()` in `timetable.ts` covers all real values (skating, fitness, aquatics, arts, sports, other).

```sql
SELECT activity_type, 'dropin'  AS source, COUNT(*) AS count
FROM dropins
GROUP BY activity_type

UNION ALL

SELECT activity_type, 'program' AS source, COUNT(*) AS count
FROM programs
GROUP BY activity_type

ORDER BY activity_type, source;
```

---

## 4. All Skating Course Titles (for TITLE_ORDER map)

**What it does:** Lists every distinct `course_title` that exists in skating drop-ins, with occurrence counts. Use this to keep the `TITLE_ORDER` priority map in `dropin-search/route.ts` complete — any title not in the map falls back to position 999 (sorts to bottom).

```sql
SELECT DISTINCT course_title, COUNT(*) AS occurrences
FROM dropins
WHERE activity_type ILIKE '%skating%'
   OR course_title  ILIKE '%skate%'
   OR course_title  ILIKE '%shinny%'
GROUP BY course_title
ORDER BY course_title;
```

---

## 5. Subcategories Within Each Activity Type (Drop-ins)

**What it does:** Groups `course_title` under each `activity_type` so you can see the subcategory breakdown for every sport. For example, under `skating` you get every Leisure Skate and Shinny variant; under `fitness` you get Yoga, Zumba, etc.

```sql
SELECT
  activity_type,
  course_title,
  COUNT(*) AS occurrences
FROM dropins
GROUP BY activity_type, course_title
ORDER BY activity_type, occurrences DESC;
```

---

## 6. Subcategories from Registered Programs (program_category)

**What it does:** Uses the `program_category` column from the `programs` table, which is the cleanest and most structured subcategory field. Shows the hierarchy of activity → subcategory for all registered (non-drop-in) programs.

```sql
SELECT
  activity_type,
  program_category,
  COUNT(*) AS count
FROM programs
WHERE program_category IS NOT NULL
GROUP BY activity_type, program_category
ORDER BY activity_type, count DESC;
```

---

## 7. Combined Subcategory View (Drop-ins + Programs)

**What it does:** Full cross-source subcategory map — drop-ins use `course_title` as the subcategory label, programs use `program_category` (falling back to `course_title` if null). Use this to plan a future activity-type filter UI that covers both session types.

```sql
SELECT
  activity_type,
  course_title                            AS subcategory,
  'dropin'                                AS source,
  COUNT(*)                                AS count
FROM dropins
WHERE activity_type IS NOT NULL
GROUP BY activity_type, course_title

UNION ALL

SELECT
  activity_type,
  COALESCE(program_category, course_title) AS subcategory,
  'program'                                AS source,
  COUNT(*)                                 AS count
FROM programs
WHERE activity_type IS NOT NULL
GROUP BY activity_type, program_category, course_title

ORDER BY activity_type, source, count DESC;
```

---

## 8. Rink Operators — Count by `operated_by`

**What it does:** Shows every distinct value in the `rinks.operated_by` field (sourced verbatim from the Toronto CKAN `"Operated By"` column) with a count of rinks per operator. Known categories:
- **PFR** — Parks, Forestry and Recreation (Toronto's own city department; operates the majority of rinks)
- **Arena Board** — semi-independent community-run local arena boards (e.g. Forest Hill, Ted Reeve)
- **Lakeshore Arena Corporation** — city-owned corporation operating Lakeshore Arena specifically
- **Other** — catch-all for anything else

```sql
SELECT operated_by, COUNT(*) AS rinks
FROM rinks
WHERE operated_by IS NOT NULL
GROUP BY operated_by
ORDER BY rinks DESC;
```

---

## 9. Rink Operators — Breakdown by Rink Type

**What it does:** Cross-tabs `operated_by` against `rink_type` (indoor / outdoor) so you can see, e.g., whether Arena Board rinks are predominantly indoor vs. outdoor.

```sql
SELECT operated_by, rink_type, COUNT(*) AS rinks
FROM rinks
WHERE operated_by IS NOT NULL
GROUP BY operated_by, rink_type
ORDER BY operated_by, rink_type;
```

---

## Notes

| Table | Key columns for analysis |
|---|---|
| `dropins` | `activity_type`, `course_title`, `first_date`, `start_time`, `end_time`, `location_id` |
| `programs` | `activity_type`, `program_category`, `course_title`, `activity_title`, `start_date`, `end_date` |
| `locations` | `name`, `address`, `district`, `coordinates` |
| `rinks` | `rink_type`, `asset_id`, `location_id`, `operated_by` |

Join pattern: `dropins/programs → locations` via `location_id = locations.id`
