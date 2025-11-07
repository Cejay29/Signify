// Re-export from your real client file (works when using a bundler like Vite or Next)
// If you're not using a bundler, just duplicate the config below
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabase = createClient(
"https://lxetbblytlvihitapazv.supabase.co",
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4ZXRiYmx5dGx2aWhpdGFwYXp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTczNDU5OCwiZXhwIjoyMDY3MzEwNTk4fQ.YTsxYCoeauVaY8a9xq2mb6rSZvdHALUmq6UvSx1D0yI",
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4ZXRiYmx5dGx2aWhpdGFwYXp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MzQ1OTgsImV4cCI6MjA2NzMxMDU5OH0.CqDTiPYDmaLouY5EdQHXXTTqZ233RPaa8G8jFFKSZ4g"

);
