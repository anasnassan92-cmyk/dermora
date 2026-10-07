/**
 * Database schema – owner: Assad. Same tables as supabase/schema.sql, adapted to MySQL
 * (Hostinger) and SQLite (local). Add a NEW migration for every change; never edit an old one.
 */

type Col = [name: string, mysql: string, sqlite: string];

function table(name: string, cols: Col[], extraMysql: string[] = [], extraSqlite: string[] = []) {
  const my = `CREATE TABLE IF NOT EXISTS ${name} (\n  ${[...cols.map(([n, m]) => `${n} ${m}`), ...extraMysql].join(',\n  ')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
  const sq = `CREATE TABLE IF NOT EXISTS ${name} (\n  ${[...cols.map(([n, , s]) => `${n} ${s}`), ...extraSqlite].join(',\n  ')}\n)`;
  return { my, sq };
}

const ID: Col = ['id', 'CHAR(36) NOT NULL PRIMARY KEY', 'TEXT PRIMARY KEY'];
const USER_FK: Col = ['user_id', 'CHAR(36) NOT NULL', 'TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE'];
const TS = (n: string, nullable = false): Col => [n, `VARCHAR(32)${nullable ? '' : ' NOT NULL'}`, `TEXT${nullable ? '' : ' NOT NULL'}`];
const TXT = (n: string, nullable = true): Col => [n, `TEXT${nullable ? '' : ' NOT NULL'}`, `TEXT${nullable ? '' : ' NOT NULL'}`];
const LONG = (n: string): Col => [n, 'LONGTEXT', 'TEXT'];
const STR = (n: string, len = 255, nullable = true): Col => [n, `VARCHAR(${len})${nullable ? '' : ' NOT NULL'}`, `TEXT${nullable ? '' : ' NOT NULL'}`];
const INT = (n: string, def?: number): Col => [n, `INT${def !== undefined ? ` NOT NULL DEFAULT ${def}` : ''}`, `INTEGER${def !== undefined ? ` NOT NULL DEFAULT ${def}` : ''}`];

const users = table('users', [
  ID,
  STR('email', 190, false),
  STR('password_hash', 100),
  STR('google_sub', 64),
  STR('first_name', 80),
  STR('last_name', 80),
  INT('email_verified', 0),
  INT('is_admin', 0),
  TS('created_at'),
  TS('last_login_at', true),
], ['UNIQUE KEY users_email (email)'], ['UNIQUE (email)']);

const codes = table('email_codes', [
  ID,
  USER_FK,
  STR('code_hash', 64, false),
  STR('purpose', 20, false),
  INT('attempts', 0),
  TS('expires_at'),
  TS('created_at'),
], ['KEY email_codes_user (user_id)', 'CONSTRAINT fk_codes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE']);

const profiles = table('profiles', [
  ['user_id', 'CHAR(36) NOT NULL PRIMARY KEY', 'TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE'],
  STR('display_name', 160),
  INT('birth_year'),
  STR('age_range', 16),
  STR('gender', 16),
  STR('country', 2),
  INT('skin_tone'),
  STR('skin_type', 16),
  INT('consent_images', 0),
  TS('consent_at', true),
  STR('locale', 5),
  TS('updated_at'),
], ['CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE']);

const assessments = table('assessments', [
  ID,
  USER_FK,
  STR('questionnaire_version', 16, false),
  STR('status', 16, false),
  LONG('answers'),
  TS('created_at'),
  TS('submitted_at', true),
  TS('analyzed_at', true),
], ['KEY assessments_user (user_id, created_at)', 'CONSTRAINT fk_assessments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE']);

const images = table('skin_images', [
  ID,
  USER_FK,
  ['assessment_id', 'CHAR(36)', 'TEXT REFERENCES assessments(id) ON DELETE SET NULL'],
  STR('file_name', 120, false),
  STR('area', 16, false),
  INT('width'),
  INT('height'),
  INT('bytes'),
  TXT('face_check'),
  TS('created_at'),
], ['KEY images_assessment (assessment_id)', 'CONSTRAINT fk_images_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE']);

const ai = table('ai_assessments', [
  ID,
  USER_FK,
  ['assessment_id', 'CHAR(36) NOT NULL', 'TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE'],
  STR('provider', 20, false),
  STR('model', 60, false),
  LONG('result'),
  INT('seek_care', 0),
  INT('input_tokens'),
  INT('output_tokens'),
  TS('created_at'),
], ['KEY ai_assessment (assessment_id, created_at)', 'CONSTRAINT fk_ai_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE']);

const chats = table('chat_messages', [
  ID,
  USER_FK,
  ['assessment_id', 'CHAR(36) NOT NULL', 'TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE'],
  STR('role', 12, false),
  TXT('content', false),
  TS('created_at'),
], ['KEY chats_assessment (assessment_id, created_at)', 'CONSTRAINT fk_chats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE']);

const plans = table('treatment_plans', [
  ID,
  USER_FK,
  ['assessment_id', 'CHAR(36)', 'TEXT REFERENCES assessments(id) ON DELETE SET NULL'],
  STR('status', 16, false),
  STR('title', 200, false),
  TXT('summary'),
  LONG('plan'),
  TS('confirmed_at', true),
  TS('created_at'),
  TS('updated_at'),
], ['KEY plans_user (user_id, created_at)', 'CONSTRAINT fk_plans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE']);

const beta = table('beta_signups', [ID, STR('email', 190, false), STR('source', 40), TS('created_at')], ['UNIQUE KEY beta_email (email)'], ['UNIQUE (email)']);

const all = [users, codes, profiles, assessments, images, ai, chats, plans, beta];

// v2 – chatbot upgrade: feedback + metadata on messages, per-user memory, routine log for "Framsteg"
const memory = table('user_memory', [
  ['user_id', 'CHAR(36) NOT NULL PRIMARY KEY', 'TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE'],
  TXT('summary'),
  INT('turns', 0),
  TS('updated_at'),
], ['CONSTRAINT fk_memory_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE']);

const routineLogs = table('routine_logs', [
  ID,
  USER_FK,
  STR('day', 10, false), // YYYY-MM-DD (local day chosen by the app)
  STR('slot', 10, false), // morning | evening | weekly
  INT('done', 1),
  TXT('note'),
  TS('created_at'),
], ['UNIQUE KEY routine_day (user_id, day, slot)', 'CONSTRAINT fk_routine_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'], ['UNIQUE (user_id, day, slot)']);

export const MIGRATIONS: { version: number; mysql: string[]; sqlite: string[] }[] = [
  { version: 1, mysql: all.map((t) => t.my), sqlite: all.map((t) => t.sq) },
  {
    version: 2,
    mysql: [
      'ALTER TABLE chat_messages ADD COLUMN rating INT NULL',
      'ALTER TABLE chat_messages ADD COLUMN feedback TEXT NULL',
      'ALTER TABLE chat_messages ADD COLUMN meta TEXT NULL',
      memory.my,
      routineLogs.my,
    ],
    sqlite: [
      'ALTER TABLE chat_messages ADD COLUMN rating INTEGER',
      'ALTER TABLE chat_messages ADD COLUMN feedback TEXT',
      'ALTER TABLE chat_messages ADD COLUMN meta TEXT',
      memory.sq,
      routineLogs.sq,
    ],
  },
];
