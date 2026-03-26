// store/useGameStore.js
import { create } from "zustand";

const useGameStore = create((set) => ({
  conectado: false,
  jogadorNome: "",
  classe: "pistoleiro",
  partida: null,
  setConectado: (v) => set({ conectado: v }),
  setJogadorNome: (nome) => set({ jogadorNome: nome }),
  setClasse: (classe) => set({ classe }),
  setPartida: (p) => set({ partida: p }),
}));

export default useGameStore;
