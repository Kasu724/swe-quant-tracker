-- Reclassify existing listings using their titles. Descriptions commonly
-- mention unrelated technologies and caused broad false-positive matches.
WITH titles AS (
  SELECT "id", ' ' || trim(regexp_replace(lower("title"), '[^a-z0-9]+', ' ', 'g')) || ' ' AS title
  FROM "InternshipPosting"
), classified AS (
  SELECT "id", CASE
    WHEN title ~ ' (quant(itative)? (research(er)?|analyst|scientist)|alpha research(er)?) ' THEN 'QUANT_RESEARCH'
    WHEN title ~ ' (quant(itative)? (developer|engineer|dev|software (developer|engineer))|((trading|market making) (systems? )?(software )?(developer|engineer))|((trading|execution) systems?)|((low latency|execution) (trading|quant))|((trading|quant) (execution|low latency))|strats? (developer|engineer)) ' THEN 'QUANT_DEV'
    WHEN title ~ ' (trader|trading analyst|trading intern|market maker|market making analyst|execution trader) ' THEN 'TRADING'
    WHEN title ~ ' (machine learning|deep learning|artificial intelligence|generative ai|gen ai|ml|ai|applied scientist|nlp|computer vision) ' THEN 'ML_AI'
    WHEN title ~ ' (data (scientist|science|engineer|engineering|analyst|analytics|architect)|analytics engineer|business intelligence|bi analyst|data platform) ' THEN 'DATA'
    WHEN title ~ ' (security|cybersecurity|cyber security|appsec|infosec|threat intelligence|penetration test(er|ing)|red team) ' THEN 'SECURITY'
    WHEN title ~ ' (fpga|asic|firmware|embedded( systems| software)?|hardware|electrical engineer|electrical engineering|vlsi|semiconductor|chip design|circuit design) ' THEN 'HARDWARE_EMBEDDED'
    WHEN title ~ ' (infrastructure|site reliability|sre|devops|platform engineering|platform engineer|distributed systems|cloud engineer|cloud infrastructure|network engineer|network engineering|systems engineer|systems engineering|low latency|data center (engineer|engineering|infrastructure)) ' THEN 'INFRA_SYSTEMS'
    WHEN title ~ ' (product (manager|management)|technical (program|product) manager|program manager|technical pm|product owner) ' THEN 'PRODUCT_PM'
    WHEN title ~ ' (software (engineer|engineering|developer|development)|full stack|frontend|front end|backend|back end|web developer|web engineer|mobile developer|mobile engineer|ios developer|android developer|swe|sde) ' THEN 'SWE'
    WHEN title ~ ' (engineer|engineering|mechanical|manufacturing|industrial|civil|chemical|aerospace|robotics) ' THEN 'ENGINEERING'
    ELSE 'OTHER'
  END AS category
  FROM titles
)
UPDATE "InternshipPosting" AS posting
SET "roleCategory" = classified.category::"RoleCategory"
FROM classified
WHERE posting."id" = classified."id"
  AND posting."roleCategory"::text IS DISTINCT FROM classified.category;
