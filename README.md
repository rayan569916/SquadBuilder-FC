# SquadBuilder FC

A match organizer for small-sided games. Admins and managers create fixtures, select available players, draw teams, edit tactics, and record results. Players can view match sheets and vote for Man of the Match after a completed game.

## Supabase Setup

1. Create a Supabase project.
2. Apply `supabase/migrations/202610170001_initial_schema.sql` in the Supabase SQL Editor.
   Then apply `supabase/migrations/202610170002_player_attributes.sql` to store the five player attributes.
3. Create the first Auth user from the Supabase Dashboard. In the SQL Editor, grant that account the initial admin role:

   ```sql
   insert into public.profiles (id, email, name, role)
   select id, email, 'Squad Admin', 'admin'
   from auth.users
   where email = 'admin@example.com';
   ```

   Replace the email with the Auth user you created. Do not put a service-role key in the app.
4. Deploy the admin account Edge Functions from the project root:

   ```sh
   npx supabase functions deploy admin-create-user
   npx supabase functions deploy admin-update-user
   ```

5. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project settings. Restart the dev server after changing environment values.

The first admin can create and edit manager and player accounts from Account Management, including login email, password, position, role, and five player attributes. Overall rating is the rounded average of the five attributes. Share initial passwords securely and have users change them after signing in. Public signup is disabled.

## Development

```sh
npm install
npm run dev
```

Type-check and create a production web build:

```sh
npm run lint
npm run build
```

## Android Device

Install Java 21 and Android SDK command-line packages, set `ANDROID_HOME` and `JAVA_HOME`, enable USB debugging on the phone, and confirm it appears in `adb devices`. Then run:

```sh
npm run android
```

Android Studio is not required when using a physical device, but the Android SDK/build tools are required.

## iOS Simulator

On macOS, install Xcode and an iOS Simulator runtime, then run:

```sh
npm run ios
```

Select a simulator in Xcode and run the app. A physical iPhone is not required for simulator testing.
