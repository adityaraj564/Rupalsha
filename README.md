# Rupalsha — Fashion Ecommerce

> Where Comfort Meets Style

Full-stack ecommerce website for **Rupalsha**, a premium fashion brand. Built with Next.js, Express, and MongoDB.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, Tailwind CSS, Zustand |
| Backend | Node.js, Express, MongoDB, Mongoose |
| Auth | JWT (JSON Web Tokens) |
| Payments | Razorpay (UPI + Cards + COD) |
| Images | Cloudinary |
| Email | Nodemailer (SMTP) |

## Project Structure

```
├── backend/           # Express REST API
│   ├── config/        # DB, Cloudinary config
│   ├── middleware/     # Auth, error handling
│   ├── models/        # Mongoose models
│   ├── routes/        # API routes
│   ├── utils/         # Email, upload helpers
│   ├── scripts/       # Seed data
│   └── server.js      # Entry point
├── frontend/          # Next.js App
│   └── src/
│       ├── app/       # Pages (App Router)
│       ├── components/# Reusable components
│       └── lib/       # API client, state store
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your values (MongoDB URI, JWT secret, etc.)
npm install
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local
npm install
npm run dev
```

### 3. Seed Database

```bash
cd backend
node scripts/seed.js
```

This creates:
- Admin account: `admin@rupalsha.com` / `admin123456`
- 8 sample products

### 4. Access the App

- **Store**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin (login with admin credentials)
- **API**: http://localhost:5000/api

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/change-password` | Change password |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |
| POST | `/api/auth/addresses` | Add address |
| PUT | `/api/auth/addresses/:id` | Update address |
| DELETE | `/api/auth/addresses/:id` | Delete address |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List products (with filters) |
| GET | `/api/products/categories` | Get categories |
| GET | `/api/products/:slug` | Get product by slug |

### Cart
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cart` | Get cart |
| POST | `/api/cart/add` | Add item |
| PUT | `/api/cart/update` | Update quantity |
| DELETE | `/api/cart/remove/:id` | Remove item |
| DELETE | `/api/cart/clear` | Clear cart |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Create order |
| GET | `/api/orders` | Get user orders |
| GET | `/api/orders/:id` | Get order details |
| PUT | `/api/orders/:id/cancel` | Cancel order |
| PUT | `/api/orders/:id/return` | Return order |

### Payment
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payment/create-order` | Create Razorpay order |
| POST | `/api/payment/verify` | Verify payment |

### Admin
All admin routes are prefixed with `/api/admin` and require admin authentication.

## Razorpay Setup

1. Sign up at [razorpay.com](https://razorpay.com)
2. Go to Dashboard → Settings → API Keys
3. Generate Key ID and Key Secret
4. Add to backend `.env`:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxx
   RAZORPAY_KEY_SECRET=xxxxx
   ```
5. Add Key ID to frontend `.env.local`:
   ```
   NEXT_PUBLIC_RAZORPAY_KEY=rzp_test_xxxxx
   ```

## Cloudinary Setup

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Go to Dashboard for credentials
3. Add to backend `.env`:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_key
   CLOUDINARY_API_SECRET=your_secret
   ```

## Deployment

### Frontend (Vercel)

1. Push to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Set root directory to `frontend`
4. Add environment variables
5. Deploy

### Backend (Render)

1. Create Web Service on [render.com](https://render.com)
2. Set root directory to `backend`
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables
6. Deploy

### MongoDB (Atlas)

1. Create free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Get connection string
3. Add to `MONGODB_URI` in backend env

## Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Soft Beige | `#E8DCCB` | Accents, highlights |
| Deep Green | `#1F3A2F` | Primary, buttons, header |
| Gold | `#C8A951` | CTAs, badges, premium elements |
| Off-white | `#F9F7F3` | Background |
| Charcoal | `#2B2B2B` | Text |

## Features

- ✅ User auth (register, login, forgot password)
- ✅ Product browsing with filters & search
- ✅ Product detail with image carousel, sizes, reviews
- ✅ Shopping cart with quantity management
- ✅ Checkout with address selection
- ✅ UPI/Card payment via Razorpay
- ✅ Cash on Delivery
- ✅ Order tracking
- ✅ Cancel/Return orders
- ✅ Wishlist
- ✅ Coupon codes
- ✅ Ratings & Reviews
- ✅ Admin Dashboard
- ✅ Admin Product/Order/User/Review management
- ✅ Email notifications
- ✅ Mobile-first responsive design
- ✅ SEO optimized
- ✅ API-first (mobile app ready)

## License

Private — All rights reserved.
