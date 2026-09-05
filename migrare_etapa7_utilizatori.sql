-- =====================================================================
-- Migrare pentru ETAPA 7: Sistemul de utilizatori
-- =====================================================================
-- Ruleaza: psql -U postgres -d postgres -f migrare_etapa7_utilizatori.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS utilizatori (
    id SERIAL PRIMARY KEY,
    nume VARCHAR(150) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    parola_hash VARCHAR(255) NOT NULL,       -- NU se salveaza parola in clar, doar hash-ul (bcrypt)
    email VARCHAR(150) UNIQUE NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'comun', -- 'comun' | 'admin' | 'moderator'
    data_inregistrare TIMESTAMP NOT NULL DEFAULT NOW(),
    data_ultima_cumparare TIMESTAMP DEFAULT NULL
);

-- Un cont de admin de test, ca sa poti testa rolurile fara sa te inregistrezi manual.
-- Parola in clar pentru acest cont de test este: admin123
-- (hash-ul de mai jos a fost generat cu bcryptjs si VERIFICAT ca functioneaza cu aceasta parola)
INSERT INTO utilizatori (nume, username, parola_hash, email, rol)
VALUES ('Admin Principal', 'admin', '$2b$10$OQtIhsMqGixQY00JUcjba.YIn7rRnzSBTvQaQ5/iibbb1AyQSvzgW', 'admin@pcbuilds.ro', 'admin')
ON CONFLICT (username) DO NOTHING;
