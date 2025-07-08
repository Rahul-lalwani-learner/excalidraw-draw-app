## Initialization

`pnpm dlx create-turbo@latest -e with-tailwind`

## Adding database
How to use Prisma ORM with Turborepo
15 min
Prisma is a powerful ORM for managing databases, and Turborepo simplifies monorepo workflows. By combining these tools, you can create a scalable, modular architecture for your projects.

This guide will show you how to set up Prisma as a standalone package in a Turborepo monorepo, enabling efficient configuration, type sharing, and database management across multiple apps.

What you'll learn:
How to set up Prisma in a Turborepo monorepo.
Steps to generate and reuse PrismaClient across packages.
Integrating the Prisma package into other applications in the monorepo.
Prerequisites
Node.js 18+
1. Set up your project
cd projet-name
pnpm add turbo --save-dev --ignore-workspace-root-check

For more information about installing Turborepo, refer to the official Turborepo guide.

2. Add a new database package to the monorepo
2.1 Create the package and install Prisma
Create a database package within the packages directory. Then, create a package.json file for the package by running:

cd packages/
mkdir database
cd database
touch package.json

Define the package.json file as follows:

packages/database/package.json
{
  "name": "@repo/db",
  "version": "0.0.0"
}

Next, install the required dependencies to use Prisma ORM. Use your preferred package manager:


pnpm add prisma --save-dev
pnpm add @prisma/client
pnpm add @prisma/extension-accelerate

2.2. Initialize Prisma and define models
Inside the database directory, initialize prisma by running:


pnpm prisma init --output ../generated/prisma
create .env file inside database
DATABASE_URL = "postgresurl"
pnpm prisma migrate dev --name init


This will create several files inside packages/database:

A prisma directory with a schema.prisma file.
A Prisma Postgres database.
A .env file containing the DATABASE_URL at the project root.
An output directory for the generated Prisma Client as generated/prisma.
In the packages/database/prisma/schema.prisma file, add the following models:

packages/database/prisma/schema.prisma
```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id        Int     @id @default(autoincrement())
  title     String
  content   String?
  published Boolean @default(false)
  authorId  Int
  author    User    @relation(fields: [authorId], references: [id])
}
```

warning
It is recommended to add ../generated/prisma to the .gitignore file because it contains platform-specific binaries that can cause compatibility issues across different environments.

The importance of generating Prisma types in a custom directory
In the schema.prisma file, we specify a custom output path where Prisma will generate its types. This ensures Prisma's types are resolved correctly across different package managers.

info
In this guide, the types will be generated in the database/generated/prisma directory.

2.3. Add scripts and run migrations
Let's add some scripts to the package.json inside packages/database:

packages/database/package.json
```json
{
  "name": "@repo/db",
  "version": "0.0.0",
  "scripts": {
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev --skip-generate",
    "db:deploy": "prisma migrate deploy"
  },
  "devDependencies": {
    "prisma": "^6.6.0"
  },
  "dependencies": {
    "@prisma/client": "^6.6.0"
  }
}
```


Let's also add these scripts to turbo.json in the root and ensure that DATABASE_URL is added to the environment:

turbo.json
```json
{
"$schema": "https://turbo.build/schema.json",
"ui": "tui",
"tasks": {
  "build": {
    "dependsOn": ["^build"],
    "inputs": ["$TURBO_DEFAULT$", ".env*"],
    "outputs": [".next/**", "!.next/cache/**"],
    "env": ["DATABASE_URL"] + this
  },
  "lint": {
    "dependsOn": ["^lint"]
  },
  "check-types": {
    "dependsOn": ["^check-types"]
  },
  "dev": {
    "cache": false,
    "persistent": true
  },
  "db:generate": { +this
    "cache": false
  },
  "db:migrate": { +this
    "cache": false,
    "persistent": true // This is necessary to interact with the CLI and assign names to your database migrations.
  },
  "db:deploy": { +this
    "cache": false
  }
}
}
```

Migrate your prisma.schema and generate types

Navigate to the project root and run the following command to automatically migrate our database:

pnpm turbo db:migrate

Generate your prisma.schema

To generate the types from Prisma schema, from the project root run:

pnpm turbo db:generate

2.4. Export the Prisma client and types
Next, export the generated types and an instance of PrismaClient so it can used in your applications.

In the packages/database directory, create a src folder and add a client.ts file. This file will define an instance of PrismaClient:

Prisma Postgres (recommended)
Other databases
packages/database/src/client.ts
```ts
import { PrismaClient } from "../generated/prisma";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma || new PrismaClient().$extends(withAccelerate());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```
`pnpm install --save-dev @types/node` to resolve the process error

Then create an index.ts file in the src folder to re-export the generated prisma types and the PrismaClient instance:

packages/database/src/index.ts
```ts
export { prisma } from './client' // exports instance of prisma 
export * from "../generated/prisma" // exports generated types from prisma
```

Follow the Just-in-Time packaging pattern and create an entrypoint to the package inside packages/database/package.json:

warning
If you're not using a bundler, use the Compiled Packages strategy instead.

packages/database/package.json
```json
{
  "name": "@repo/db",
  "version": "0.0.0",
  "scripts": { + this
    "db:generate": "npx prisma generate",
    "db:migrate": "npx prisma migrate dev --skip-generate",
    "db:deploy": "npx prisma migrate deploy"
  },
  "devDependencies": {
    "prisma": "^6.6.0"
  },
  "dependencies": {
    "@prisma/client": "^6.6.0"
  },
  "exports": {
    ".": "./src/index.ts"
  }
}
```


By completing these steps, you'll make the Prisma types and PrismaClient instance accessible throughout the monorepo.

3. Import the database package in the web app
The turborepo-prisma project should have an app called web at apps/web. Add the database dependency to apps/web/package.json:

`inside webapp package json to be able to use @repo/db`
```json
{
  // ...
  "dependencies": {
    "@repo/db": "*"
    // ...
  }
  // ...
} 
```

Run your package manager's install command inside the apps/web directory:


cd apps/web
pnpm install

Let's import the intantiated prisma client from the database package in the web app.

In the apps/web/app directory, open the page.tsx file and add the following code:

apps/web/app/page.tsx
```tsx
import { prisma } from "@repo/db";

export default async function Home() {
  const user = await prisma.user.findFirst() 
  return (
    <div>
      {user?.name ?? "No user added yet"}
    </div>
  );
}
```
Then, create a .env file in the web directory and copy into it the contents of the .env file from the /database directory containing the DATABASE_URL:

apps/web/.env
```json
DATABASE_URL="Same database url as used in the database directory"
```

note
If you want to use a single .env file in the root directory across your apps and packages in a Turborepo setup, consider using a package like 
dotenvx
.

To implement this, update the package.json files for each package or app to ensure they load the required environment variables from the shared .env file. For detailed instructions, refer to the 
dotenvx
guide for Turborepo.

Keep in mind that Turborepo recommends using separate
.env
files for each package to promote modularity and avoid potential conflicts.

4. Configure task dependencies in Turborepo
The db:generate and db:deploy scripts are not yet optimized for the monorepo setup but are essential for the dev and build tasks.

If a new developer runs turbo dev on an application without first running db:generate, they will encounter errors.

To prevent this, ensure that db:generate is always executed before running dev or build. Additionally, make sure both db:deploy and db:generate are executed before db:build. Here's how to configure this in your turbo.json file:

turbo.json
```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build", "^db:generate"], +this
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**"],
      "env": ["DATABASE_URL"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "check-types": {
      "dependsOn": ["^check-types"]
    },
    "dev": {
      "dependsOn": ["^db:generate"], + this
      "cache": false,
      "persistent": true
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false,
      "persistent": true
    },
    "db:deploy": {
      "cache": false
    }
  }
}
```

5. Run the project in development
warning
Before starting the development server, note that if you are using Next.js v15.2.0, do not use Turbopack as there is a known issue. Remove Turbopack from your dev script by updating your apps/web/package.json

apps/web/package.json
"script":{
    "dev": "next dev --port 3000",
}

Then from the project root run the project:


`pnpm turbo run dev`

Navigate to the http://localhost:3000 and you should see the message:

No user added yet

note
You can add users to your database by creating a seed script or manually by using Prisma Studio.

To use Prisma Studio to add manually data via a GUI, navigate inside the packages/database directory and run prisma studio using your package manager:

npm
yarn
pnpm
npx prisma studio

This command starts a server with a GUI at http://localhost:5555, allowing you to view and modify your data.

Congratulations, you're done setting up Prisma for Turborepo!

Next Steps
Expand your Prisma models to handle more complex data relationships.
Implement additional CRUD operations to enhance your application's functionality.
Check out Prisma Postgres to see how you can scale your application.
More Info
Turborepo Docs
Next.js Docs
Prisma ORM Docs

Stay connected with Prisma
Continue your Prisma journey by connecting with our active community. Stay informed, get involved, and collaborate with other developers:
Follow us on X for announcements, live events and useful tips.
Join our Discord to ask questions, talk to the community, and get active support through conversations.
Subscribe on YouTube for tutorials, demos, and streams.
Engage on GitHub by starring the repository, reporting issues, or contributing to an issue.
We genuinely value your involvement and look forward to having you as part of our community!