import { configureStore } from '@reduxjs/toolkit';
import { authApi } from '../features/auth/authApi';
import { dashboardApi } from '../features/dashboard/dashboardApi';
import { expenseApi } from '../features/expenses/expenseApi';
import { employeeApi } from '../features/employees/employeeApi';
import { payrollApi } from '../features/payroll/payrollApi';
import { budgetApi } from '../features/budget/budgetApi';
import { aiApi } from '../features/ai/aiApi';
import authReducer from '../features/auth/authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [dashboardApi.reducerPath]: dashboardApi.reducer,
    [expenseApi.reducerPath]: expenseApi.reducer,
    [employeeApi.reducerPath]: employeeApi.reducer,
    [payrollApi.reducerPath]: payrollApi.reducer,
    [budgetApi.reducerPath]: budgetApi.reducer,
    [aiApi.reducerPath]: aiApi.reducer,
  },
  middleware: (gDM) =>
    gDM().concat(
      authApi.middleware,
      dashboardApi.middleware,
      expenseApi.middleware,
      employeeApi.middleware,
      payrollApi.middleware,
      budgetApi.middleware,
      aiApi.middleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
