# RupeeRoot
 🌱 Build Better Money Habits. A smart student expense analyzer and budget planner designed to make personal finance simple.

# 🌱 RupeeRoot

### Build Better Money Habits.

RupeeRoot is a student-focused personal finance platform designed to help students track their daily expenses, manage monthly budgets, understand spending patterns, and develop healthier financial habits.

Managing money as a student can be challenging. RupeeRoot makes personal finance simple by bringing expense tracking, budgeting, and financial insights into one intuitive platform.

---

## 📌 About The Project

RupeeRoot is a Student Expense Analyzer & Budget Planner built to make everyday financial management easier and more accessible.

The platform helps students understand where their money goes, monitor their spending, and make informed financial decisions.

Whether you spend through UPI, cash, or other payment methods, RupeeRoot provides a centralized place to manage your personal finances.

### 🎯 Project Objectives

- Simplify daily expense tracking.
- Help students manage monthly budgets.
- Categorize income and expenses.
- Visualize spending patterns through analytics.
- Monitor budget utilization.
- Encourage better financial habits.
- Provide a clean and intuitive personal finance experience.

---

## ✨ Features

### 💰 Expense & Income Tracking

- Add income and expense transactions.
- Record transaction amount, category, date, and description.
- Categorize expenses such as Food, Travel, Shopping, Education, and Entertainment.
- Maintain transaction history.
- Edit or delete existing transactions.

### 📊 Financial Dashboard

- View total balance.
- Track monthly income.
- Monitor monthly expenses.
- View remaining budget.
- Get an overview of personal financial activity.

### 📅 Budget Planner

- Create monthly spending budgets.
- Set category-wise budget limits.
- Monitor budget utilization.
- Track remaining budget.
- Identify categories approaching their spending limits.

### 📈 Financial Analytics

- Visualize income versus expenses.
- Analyze monthly spending trends.
- View category-wise expense distribution.
- Understand spending patterns through interactive charts.

### 🔔 Budget Monitoring

- Monitor spending against budget limits.
- Receive alerts when approaching or exceeding a budget.
- Identify categories where spending needs attention.

### 📄 Financial Reports

- Generate expense summaries.
- Review monthly financial activity.
- Export financial data in supported formats such as CSV or PDF.

### 🎓 Student-Focused Experience

- Designed around student financial needs.
- Supports Indian Rupee (₹).
- Simple and intuitive interface.
- Helps students develop responsible spending habits.

---

## 🖥️ Website Preview

RupeeRoot features a clean, modern fintech-inspired interface.

The design focuses on:

- Pure white backgrounds
- Deep navy typography
- Professional blue accents
- Minimal and spacious layouts
- Rounded financial summary cards
- Clear charts and financial indicators
- Responsive layouts for different screen sizes

The goal is to provide a simple and professional experience without overwhelming users with unnecessary financial complexity.

---

## 🛠️ Tech Stack

The project is designed using modern full-stack web technologies.

| Technology | Purpose |
|---|---|
| Next.js | Full-stack React framework |
| React | User interface |
| TypeScript | Type safety |
| Tailwind CSS | Styling and responsive design |
| shadcn/ui | Reusable UI components |
| Lucide React | Icons |
| Recharts | Financial charts and analytics |
| Supabase | Authentication and PostgreSQL database |

> Update this section if your final implementation uses different libraries or services.

---

## 🏗️ Project Architecture

RupeeRoot follows a modular full-stack architecture.

```text
RupeeRoot
│
├── Frontend
│   ├── Landing Page
│   ├── Authentication
│   ├── Dashboard
│   ├── Transactions
│   ├── Budget Planner
│   ├── Analytics
│   └── Reports
│
├── Backend
│   ├── Authentication
│   ├── Transaction Management
│   ├── Budget Management
│   ├── Analytics Processing
│   └── Report Generation
│
└── Database
    ├── User Profiles
    ├── Transactions
    ├── Budgets
    └── Savings Goals
```

---

## 🗄️ Database Structure

The application uses a relational database structure to organize financial information.

### Users

Stores user profile information.

| Field | Description |
|---|---|
| id | Unique profile ID |
| user_id | Authenticated user ID |
| full_name | User's name |
| created_at | Account creation date |

### Transactions

Stores income and expense records.

| Field | Description |
|---|---|
| id | Transaction ID |
| user_id | Owner of the transaction |
| title | Transaction description |
| amount | Transaction amount |
| category | Transaction category |
| type | Income or expense |
| date | Transaction date |

### Budgets

Stores monthly and category-wise budgets.

| Field | Description |
|---|---|
| id | Budget ID |
| user_id | Budget owner |
| category | Budget category |
| limit_amount | Spending limit |
| month | Budget month |

---

## 🔐 Security & Privacy

RupeeRoot is designed with user data privacy in mind.

- Secure user authentication.
- User-specific financial records.
- Database-level access control.
- Row Level Security (RLS) for supported database operations.
- Users can access only their own financial data.
- Sensitive credentials are stored in environment variables.
- Passwords are handled by the authentication provider.

RupeeRoot is a personal finance management tool and does not directly provide banking, lending, or investment services.

---

## 📱 Responsive Design

RupeeRoot is designed to provide a consistent experience across devices.

| Device | Experience |
|---|---|
| Desktop | Full dashboard and analytics |
| Laptop | Responsive multi-column layout |
| Tablet | Adaptive dashboard layout |
| Mobile | Compact cards and mobile-friendly navigation |

The interface adapts to different screen sizes while maintaining readability and usability.

---

## 🚀 Getting Started

Follow these instructions to run RupeeRoot locally.

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- Git
- A Supabase account, if using Supabase for authentication and database

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/rupeeroot.git
```

### 2. Navigate to the Project

```bash
cd rupeeroot
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory.

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Use the environment variable names required by your existing Supabase configuration.

Never expose your Supabase service-role key in frontend code.

### 5. Run the Development Server

```bash
npm run dev
```

Open the application in your browser:

```text
http://localhost:3000
```

---

## 📂 Project Structure

A typical project structure:

```text
rupeeroot/
│
├── public/
│   ├── images/
│   └── logo/
│
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── budgets/
│   │   ├── analytics/
│   │   └── reports/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   └── layout/
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   └── utils/
│   │
│   ├── hooks/
│   ├── types/
│   └── services/
│
├── .env.local
├── .gitignore
├── package.json
├── README.md
└── tsconfig.json
```

The exact structure may vary depending on the implementation.

---

## 🧠 Future Enhancements

Potential improvements for RupeeRoot include:

- AI-powered spending insights.
- Intelligent expense categorization.
- Personalized budget recommendations.
- Monthly spending forecasts.
- Savings goal tracking.
- Financial habit scoring.
- Recurring transaction detection.
- Advanced financial analytics.

These enhancements can make RupeeRoot more intelligent and useful as a personal finance platform.

---

## 🎓 Academic Project

RupeeRoot is developed as a student project to demonstrate the application of full-stack web development, database management, authentication, financial analytics, and responsive UI design to a real-world problem.

The project focuses on building a practical solution that encourages financial awareness and responsible money management among students.

---

## 🤝 Contributing

Contributions, suggestions, and improvements are welcome.

If you would like to contribute:

1. Fork the repository.
2. Create a new branch.
3. Make your changes.
4. Commit your changes.
5. Submit a pull request.

---

## 📄 License

This project is licensed under the MIT License.

See the `LICENSE` file for more information.

---

## 👨‍💻 Developer

Developed with dedication to making personal finance simpler for students.

**RupeeRoot**

Build Better Money Habits. 🌱
