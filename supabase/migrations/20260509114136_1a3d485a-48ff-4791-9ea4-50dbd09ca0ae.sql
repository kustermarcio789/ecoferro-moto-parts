UPDATE auth.users
SET encrypted_password = crypt('ecoferro123', gen_salt('bf')),
    email_confirmed_at = now(),
    updated_at = now()
WHERE email = 'ecoferro02@gmail.com';