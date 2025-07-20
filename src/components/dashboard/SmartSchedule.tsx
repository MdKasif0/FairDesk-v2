@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 224 71.4% 4.1%;
    --card: 0 0% 100%;
    --card-foreground: 224 71.4% 4.1%;
    --popover: 0 0% 100%;
    --popover-foreground: 224 71.4% 4.1%;
    --primary: 262.1 83.3% 57.8%; /* purple */
    --primary-foreground: 0 0% 98%;
    --secondary: 220 13% 91%;
    --secondary-foreground: 224 71.4% 4.1%;
    --muted: 220 13% 91%;
    --muted-foreground: 225.9 5.3% 44.7%;
    --accent: 220 14.3% 95.9%;
    --accent-foreground: 224 71.4% 4.1%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 220 13% 91%;
    --input: 220 13% 91%;
    --ring: 262.1 83.3% 57.8%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 224 71.4% 4.1%;
    --foreground: 0 0% 98%;
    --card: 224 71.4% 4.1%;
    --card-foreground: 0 0% 98%;
    --popover: 224 71.4% 4.1%;
    --popover-foreground: 0 0% 98%;
    --primary: 262.1 83.3% 57.8%;
    --primary-foreground: 0 0% 98%;
    --secondary: 215 27.9% 16.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 215 27.9% 16.9%;
    --muted-foreground: 0 0% 63.9%;
    --accent: 215 27.9% 16.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 215 27.9% 16.9%;
    --input: 215 27.9% 16.9%;
    --ring: 262.1 83.3% 57.8%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}