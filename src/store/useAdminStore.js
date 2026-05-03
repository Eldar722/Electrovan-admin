import { create } from 'zustand';

export const useAdminStore = create((set) => ({
    modalOpen: false,
    editingCar: null,
    refreshTick: 0,

    openModal: (car = null) => set({ modalOpen: true, editingCar: car }),
    closeModal: () => set({ modalOpen: false, editingCar: null }),
    triggerRefresh: () => set((state) => ({ refreshTick: state.refreshTick + 1 })),
}));
