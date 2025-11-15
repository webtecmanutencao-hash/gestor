// src/services/api.js
const API_BASE_URL = "https://gateway-braip.onrender.com";

export async function listarClientes() {
  try {
    const response = await fetch(`${API_BASE_URL}/clientes`);
    if (!response.ok) {
      throw new Error("Erro ao buscar clientes");
    }
    return await response.json();
  } catch (error) {
    console.error("Erro ao conectar com o backend:", error);
    return [];
  }
}
