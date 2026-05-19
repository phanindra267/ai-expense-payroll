import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/auth' }),
  endpoints: (builder) => ({
    login: builder.mutation<any, { email: string; password: string }>({
      query: (body) => ({ url: '/login', method: 'POST', body }),
    }),
    register: builder.mutation<any, { orgName: string; email: string; password: string }>({
      query: (body) => ({ url: '/register', method: 'POST', body }),
    }),
    refresh: builder.mutation<any, { refreshToken: string }>({
      query: (body) => ({ url: '/refresh', method: 'POST', body }),
    }),
    logout: builder.mutation<any, { refreshToken: string }>({
      query: (body) => ({ url: '/logout', method: 'POST', body }),
    }),
    forgotPassword: builder.mutation<any, { email: string }>({
      query: (body) => ({ url: '/forgot-password', method: 'POST', body }),
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation, useRefreshMutation, useLogoutMutation, useForgotPasswordMutation } = authApi;
