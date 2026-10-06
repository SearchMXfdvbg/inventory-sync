import tkinter as tk
from tkinter import filedialog, messagebox
import threading
import time
import requests
import os

class InventorySyncDesktop:
    def __init__(self, root):
        self.root = root
        self.root.title("Inventory Sync Desktop (Punto de Venta)")
        self.root.geometry("500x550")
        self.root.configure(padx=20, pady=20)
        
        self.is_running = False
        self.thread = None

        # Title
        tk.Label(root, text="Sincronizador Local de Inventario", font=("Arial", 16, "bold")).pack(pady=(0, 20))

        # API settings
        tk.Label(root, text="URL del Backend:").pack(anchor="w")
        self.url_entry = tk.Entry(root, width=50)
        self.url_entry.insert(0, "https://inventory-sync-5y8u.onrender.com")
        self.url_entry.pack(pady=(0, 10))

        tk.Label(root, text="PIN de Admin:").pack(anchor="w")
        self.pin_entry = tk.Entry(root, width=50, show="*")
        self.pin_entry.insert(0, "060718")
        self.pin_entry.pack(pady=(0, 10))

        # Mode Selection
        tk.Label(root, text="Fuente de Datos:", font=("Arial", 10, "bold")).pack(anchor="w", pady=(10, 5))
        
        self.mode_var = tk.StringVar(value="excel")
        tk.Radiobutton(root, text="Archivo Excel (.xlsx)", variable=self.mode_var, value="excel").pack(anchor="w")
        tk.Radiobutton(root, text="Base de Datos Local (Proximamente)", variable=self.mode_var, value="db", state="disabled").pack(anchor="w")

        # Excel File Picker
        self.file_frame = tk.Frame(root)
        self.file_frame.pack(fill="x", pady=10)
        
        self.file_path_var = tk.StringVar(value="Ningún archivo seleccionado")
        tk.Label(self.file_frame, textvariable=self.file_path_var, fg="blue").pack(side="left")
        tk.Button(self.file_frame, text="Examinar...", command=self.browse_file).pack(side="right")

        # Interval
        tk.Label(root, text="Intervalo de Sincronización (segundos):").pack(anchor="w", pady=(10, 0))
        self.interval_entry = tk.Entry(root, width=10)
        self.interval_entry.insert(0, "60")
        self.interval_entry.pack(anchor="w", pady=(0, 20))

        # Buttons
        self.btn_frame = tk.Frame(root)
        self.btn_frame.pack(fill="x", pady=10)

        self.start_btn = tk.Button(self.btn_frame, text="▶ INICIAR SYNC", bg="green", fg="white", font=("Arial", 12, "bold"), command=self.toggle_sync)
        self.start_btn.pack(fill="x", ipady=5)

        # Log
        tk.Label(root, text="Registro de Actividad:").pack(anchor="w")
        self.log_text = tk.Text(root, height=8, width=50, state="disabled")
        self.log_text.pack(fill="both", expand=True)

    def log(self, message):
        self.log_text.config(state="normal")
        t = time.strftime("%H:%M:%S")
        self.log_text.insert("end", f"[{t}] {message}\n")
        self.log_text.see("end")
        self.log_text.config(state="disabled")
        self.root.update()

    def browse_file(self):
        filename = filedialog.askopenfilename(
            title="Seleccionar Inventario",
            filetypes=(("Archivos Excel", "*.xlsx;*.xls"), ("Todos los archivos", "*.*"))
        )
        if filename:
            self.file_path_var.set(filename)

    def toggle_sync(self):
        if self.is_running:
            self.stop_sync()
        else:
            self.start_sync()

    def start_sync(self):
        if self.mode_var.get() == "excel":
            if not os.path.exists(self.file_path_var.get()):
                messagebox.showerror("Error", "Selecciona un archivo Excel válido.")
                return

        try:
            self.interval = int(self.interval_entry.get())
        except ValueError:
            messagebox.showerror("Error", "El intervalo debe ser un número entero (segundos).")
            return

        self.is_running = True
        self.start_btn.config(text="■ DETENER SYNC", bg="red")
        self.log("Sincronizador INICIADO...")
        
        self.thread = threading.Thread(target=self.sync_loop, daemon=True)
        self.thread.start()

    def stop_sync(self):
        self.is_running = False
        self.start_btn.config(text="▶ INICIAR SYNC", bg="green")
        self.log("Sincronizador DETENIDO.")

    def sync_loop(self):
        while self.is_running:
            self.perform_sync()
            # Sleep in chunks to allow stopping quickly
            for _ in range(self.interval):
                if not self.is_running:
                    break
                time.sleep(1)

    def perform_sync(self):
        self.log("Enviando datos al servidor...")
        url = self.url_entry.get().rstrip("/") + "/sync/from-excel"
        headers = {"X-Admin-PIN": self.pin_entry.get()}
        filepath = self.file_path_var.get()

        try:
            with open(filepath, "rb") as f:
                files = {"file": (os.path.basename(filepath), f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
                response = requests.post(url, headers=headers, files=files, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"ÉXITO: {data.get('message', 'Sincronizado')}")
            else:
                self.log(f"ERROR: {response.status_code} - {response.text}")
        except Exception as e:
            self.log(f"FALLO DE RED: {str(e)}")

if __name__ == "__main__":
    root = tk.Tk()
    app = InventorySyncDesktop(root)
    root.mainloop()
