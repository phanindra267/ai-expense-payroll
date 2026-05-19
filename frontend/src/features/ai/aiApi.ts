import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../../app/store';

export const aiApi = createApi({
  reducerPath: 'aiApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/ai',
    prepareHeaders: (h, { getState }) => {
      const t = (getState() as RootState).auth.accessToken;
      if (t) h.set('authorization', `Bearer ${t}`);
      return h;
    },
  }),
  endpoints: (b) => ({
    chat: b.mutation<any, { query: string; role: string }>({
      query: (body) => ({ url: '/chat', method: 'POST', body }),
    }),
    getRoles: b.query<any, void>({
      query: () => '/roles',
    }),
  }),
});

export const { useChatMutation, useGetRolesQuery } = aiApi;
