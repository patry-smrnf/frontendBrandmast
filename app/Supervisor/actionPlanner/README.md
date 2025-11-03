# ActionPlanner - Supervisor Module

## 🎯 Overview

This is the **ActionPlanner** page for supervisors to manage and view planned actions across multiple stores.

## 📊 Features

✅ **Displays 800+ actions** - Optimized for handling large datasets  
✅ **Smart Filtering** - Filter by Event, Month, and Since Date  
✅ **Grouped by Date** - Actions organized chronologically  
✅ **Compact Cards** - Mobile-responsive design  
✅ **Create New Actions** - Dialog with calendar picker  
✅ **Dark Modern UI** - Consistent with app design system  

## 🔥 Currently Using Hardcoded Data

The page is currently configured with **hardcoded test data** to allow frontend development without backend dependencies.

### Generated Data:
- **~800-1500 actions** spread over 60 days
- **10 shops** in Warsaw area
- **5 events** (Black Friday, Promocja Świąteczna, etc.)
- **5 brandmasters** assigned randomly
- **3 statuses** (ACCEPTED, PENDING, DECLINED)

## 🔧 Switching to Real API

When backend is ready, uncomment the commented sections in:

### `ActionPlannerPage.tsx`
```typescript
// Line ~195-241: Uncomment the API fetch code
// Line ~262-267: Uncomment the filter refetch effect
```

### `CreateActionDialog.tsx`
```typescript
// Line ~86-94: Uncomment shop/event fetch
// Line ~144-162: Uncomment create action API call
```

## 📡 Required API Endpoints

### 1. GET `/api/sv/plannedActions`
Query params: `?event=EventName&month=YYYY-MM&since=YYYY-MM-DD`

Expected response:
```typescript
Array<{
  loginAccount: string;
  imie: string;
  nazwisko: string;
  actions: Array<{
    id: number;
    status: string;
    since: string; // ISO datetime
    until: string; // ISO datetime
    shop: { id: number; name: string; address: string; };
    event: { id: number; name: string; };
  }>;
}>
```

### 2. GET `/api/general/events`
Returns array of events:
```typescript
Array<{
  id: number;
  name: string;
  tpEventId: string;
}>
```

### 3. POST `/api/sv/createAction`
Body:
```typescript
{
  shopId: number;
  eventId: number;
  since: string; // "YYYY-MM-DDTHH:mm:ss"
  until: string; // "YYYY-MM-DDTHH:mm:ss"
}
```

## 🚀 Access

- **URL**: `/Supervisor/actionPlanner`
- **Menu**: Context menu (3 dots) → "Planer Akcji"
- **Auth**: Requires `SV` role

## 📱 Mobile Responsive

Grid adapts automatically:
- **Mobile**: 1 column
- **Tablet**: 2 columns
- **Laptop**: 3 columns
- **Desktop**: 4 columns

## 🎨 Components

- **ActionPlannerPage.tsx** - Main page with filters and data fetching
- **ActionPlannerCard.tsx** - Compact card displaying action details
- **CreateActionDialog.tsx** - Modal for creating new actions
- **page.tsx** - Next.js route wrapper with AuthGuard

---

**Note**: If you see TypeScript import errors, restart the TS server in your IDE - the files are correctly created and exported.

