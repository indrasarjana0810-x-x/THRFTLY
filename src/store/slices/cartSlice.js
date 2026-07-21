/* ==========================================
   State Keranjang (Sinkronisasi Database)
========================================== */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Thunk untuk fetch data keranjang dari backend (dipanggil saat login / refresh)
export const fetchCart = createAsyncThunk('cart/fetchCart', async (_, { rejectWithValue }) => {
  try {
    const response = await api.cart.get();
    if (response && response.status === 200) {
      return response.data || []; // Array of Item IDs
    }
    return rejectWithValue(response.message);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

// Thunk untuk sinkronisasi aksi toggle keranjang ke backend
export const toggleCartApi = createAsyncThunk('cart/toggleCartApi', async (idItem, { rejectWithValue }) => {
  try {
    const response = await api.cart.toggle(idItem);
    if (response && response.status === 200) {
      return idItem;
    }
    return rejectWithValue(response.message);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const initialState = {
  itemIds: [],
  status: 'idle', // idle | loading | succeeded | failed
  error: null
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Reducer lokal buat Optimistic Update langsung dari UI
    toggleCartOptimistic: (state, action) => {
      const id = action.payload;
      if (state.itemIds.includes(id)) {
        state.itemIds = state.itemIds.filter((itemId) => itemId !== id);
      } else {
        state.itemIds.push(id);
      }
    },
    clearCart: (state) => {
      state.itemIds = [];
      state.status = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.itemIds = action.payload;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  }
});

export const { toggleCartOptimistic, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
export const selectCartItems = (state) => state.cart.itemIds;
