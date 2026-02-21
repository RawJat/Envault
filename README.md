# Envault

**Envault** is a secure, modern vault application built with Next.js, Supabase, and Tailwind CSS. It provides a robust authentication system and a sleek user interface for storing and managing sensitive information.

## Features

- **Bank-Grade Security**: AES-256-GCM encryption with master/data key hierarchy and automatic key rotation.
- **Project Workspaces**: Organize secrets into distinct projects for better management.
- **Team Collaboration**: Secure project sharing with role-based access control (Owner, Editor, Viewer).
- **Secure Authentication**: Powered by Supabase Auth for robust user management, including **Passkey** support for passwordless, biometric login.
- **Modern UI/UX**: Built with Tailwind CSS, Shadcn UI, and Framer Motion for a premium experience.
- **Interactive 3D Elements**: High-performance 3D visuals powered by React Three Fiber.
- **Keyboard First**: Navigate efficiently with fully customizable, conflict-free hotkeys.
- **Responsive Design**: Fully responsive layout that works seamlessly on desktop and mobile.
- **Dark Mode Support**: Built-in support for light and dark themes.
- **CLI Support**: Manage your secrets directly from your terminal.
- **Real-time System Status**: Monitor system health, active incidents, and historical uptime with a dedicated status page.
- **Dedicated Support Page**: Integrated support features directly within the app to help users manage troubleshooting options efficiently.
- **Comprehensive Documentation**: Integrated docs site with guides, API reference, and CLI documentation.

## CLI

Envault comes with a high-performance Go CLI to manage your secrets without leaving your terminal.

### Installation

**macOS & Linux (Universal)**

```bash
curl -fsSL https://raw.githubusercontent.com/DinanathDash/Envault/main/install.sh | sh
```

**macOS (Homebrew)**

```bash
brew tap DinanathDash/envault
brew install envault
```

For more details, check out the [CLI Documentation](./cli-go/README.md).

## Security Architecture

Envault uses a hybrid encryption model to ensure maximum security:

1.  **Master Key**: A 32-byte key stored in environment variables, used solely to encrypt/decrypt Data Keys.
2.  **Data Keys**: Unique keys for encrypting actual data. These are stored encrypted in the database.
3.  **Key Rotation**: Data keys can be rotated. The active key is cached in Redis for high performance without compromising security.
4.  **AES-256-GCM**: Industry-standard authenticated encryption for all secrets.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **KV Store**: [Upstash Redis](https://upstash.com/)
- **Documentation**: [Fumadocs](https://www.fumadocs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/) / [Radix UI](https://www.radix-ui.com/)
- **3D & Graphics**: [React Three Fiber](https://r3f.docs.pmnd.rs/) / [Three.js](https://threejs.org/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/)
- **Analytics**: [Vercel Analytics](https://vercel.com/analytics)

## Getting Started

Follow these steps to get the project running locally.

### Prerequisites

- Node.js 18+ installed
- A Supabase project set up

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/dinanathdash/envault.git
    cd envault
    ```

2.  **Install dependencies**

    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    # or
    bun install
    ```

3.  **Environment Setup**

    Copy the example environment file:

    ```bash
    cp .env.example .env.local
    ```

    Open `.env.local` and add your Supabase credentials:

    ```env
    NEXT_PUBLIC_SUPABASE_URL=your-project-url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

    # Generate a secure key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ENCRYPTION_KEY=your-64-char-hex-key

    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

    UPSTASH_REDIS_REST_URL=your-upstash-url
    UPSTASH_REDIS_REST_TOKEN=your-upstash-token
    ```

4.  **Run the development server**

    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to submit a pull request and our code of conduct.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
