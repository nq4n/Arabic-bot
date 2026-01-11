# Supabase Function Deployment Instructions

We have explicitly set the `status: 200` for the `OPTIONS` preflight responses in both `create-user` and `delete-user` functions, as suggested by the common causes documentation.

Please follow these steps to re-deploy your Supabase Edge Functions:

1.  **Ensure Supabase CLI is installed and configured:**
    If you haven't already, install the Supabase CLI. You can find instructions on the official Supabase documentation. You should also have logged in to your Supabase account via the CLI (`supabase login`).

2.  **Navigate to your Supabase project root:**
    Make sure you are in the root directory of your Supabase project (where your `supabase` folder is located). In this case, it appears to be `c:\Users\Muaiyad\Desktop\arabic\Arabic-bot`.

3.  **Deploy the `create-user` function:**
    Run the following command in your terminal:
    ```bash
    supabase functions deploy create-user --project-ref YOUR_PROJECT_REF
    ```

4.  **Deploy the `delete-user` function:**
    Run the following command in your terminal:
    ```bash
    supabase functions deploy delete-user --project-ref YOUR_PROJECT_REF
    ```

    **Important:** Replace `YOUR_PROJECT_REF` with your actual Supabase project ID. You can find your project ID in your Supabase project URL (e.g., `https://app.supabase.com/project/YOUR_PROJECT_REF/`...).

5.  **Database Schema Update (Manual Action Required):**
    You *must* manually add the `added_by_teacher_id` column to your `profiles` table in Supabase for the new backend logic to function correctly.
    You can do this by running the following SQL command in your Supabase SQL Editor:
    ```sql
    ALTER TABLE profiles ADD COLUMN added_by_teacher_id UUID REFERENCES profiles(id);
    ```
    This column should be nullable (`UUID REFERENCES profiles(id)` is sufficient for nullable by default).

After completing these steps, please **carefully follow the diagnostic steps you provided earlier**:

*   **Check Network tab:**
    *   Find the `OPTIONS` request to `/delete-user`.
    *   Look at its `Status` and `Response headers` (specifically `Access-Control-Allow-Origin`).
*   **Test with curl:**
    ```bash
    curl -i -X OPTIONS \
      "https://dcevcijesbzbysvgviks.supabase.co/functions/v1/delete-user" \
      -H "Origin: http://localhost:5173" \
      -H "Access-Control-Request-Method: POST" \
      -H "Access-Control-Request-Headers: authorization, content-type"
    ```
    You want a `200/204` status plus the CORS headers.

Please provide the output of these diagnostic steps.