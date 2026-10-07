import customtkinter as ctk
from tkinter import filedialog, messagebox
import threading
import time
import requests
import os
import base64

# Configurar apariencia moderna
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("green")

class InventorySyncDesktop(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("Inventory Sync - Agente Local")
        self.geometry("520x650")
        self.resizable(False, False)
        
        self.url = ""
        self.pin = ""
        self.is_running = False
        self.thread = None
        
        self.build_auth_screen()

    def build_auth_screen(self):
        # Limpiar pantalla
        for widget in self.winfo_children():
            widget.destroy()
            
        self.grid_columnconfigure(0, weight=1)
        
        ctk.CTkLabel(self, text="INVENTORY SYNC", font=ctk.CTkFont(size=28, weight="bold"), text_color="#00ff66").pack(pady=(80, 10))
        ctk.CTkLabel(self, text="Agente Local de Sincronización", text_color="gray", font=ctk.CTkFont(size=14)).pack(pady=(0, 50))
        
        ctk.CTkLabel(self, text="CÓDIGO DE VINCULACIÓN:", font=ctk.CTkFont(size=12, weight="bold")).pack(pady=(0, 5))
        self.token_entry = ctk.CTkEntry(self, placeholder_text="Pega el código de la plataforma aquí...", width=400, height=45, justify="center")
        self.token_entry.pack(pady=(0, 30))
        
        btn = ctk.CTkButton(self, text="VINCULAR AGENTE", command=self.verify_token, width=250, height=45, font=ctk.CTkFont(weight="bold", size=14))
        btn.pack(pady=10)

    def verify_token(self):
        token = self.token_entry.get().strip()
        try:
            decoded = base64.b64decode(token).decode('utf-8')
            parts = decoded.split('|')
            if len(parts) == 2 and parts[0].startswith("http"):
                self.url = parts[0]
                self.pin = parts[1]
                self.build_main_screen()
            else:
                messagebox.showerror("Error", "Código inválido o corrupto.")
        except Exception:
            messagebox.showerror("Error", "Código no válido. Cópialo completo desde el panel web.")

    def build_main_screen(self):
        for widget in self.winfo_children():
            widget.destroy()
        
        header = ctk.CTkFrame(self, fg_color="transparent")
        header.pack(fill="x", padx=20, pady=(20, 10))
        
        ctk.CTkLabel(header, text="● AGENTE CONECTADO", font=ctk.CTkFont(size=18, weight="bold"), text_color="#00ff66").pack(anchor="w")
        ctk.CTkLabel(header, text=f"Servidor: {self.url}", text_color="gray", font=ctk.CTkFont(size=10)).pack(anchor="w")

        # Configuración Origen
        frame_mode = ctk.CTkFrame(self)
        frame_mode.pack(fill="x", padx=20, pady=10)
        
        ctk.CTkLabel(frame_mode, text="1. ORIGEN DE DATOS LOCAL", font=ctk.CTkFont(weight="bold", size=12)).pack(anchor="w", padx=15, pady=(15, 5))
        self.mode_var = ctk.StringVar(value="excel")
        ctk.CTkRadioButton(frame_mode, text="Archivo Excel (.xlsx)", variable=self.mode_var, value="excel").pack(anchor="w", padx=25, pady=5)
        db_radio = ctk.CTkRadioButton(frame_mode, text="Base de Datos SQL/Local (Próximamente)", variable=self.mode_var, value="db")
        db_radio.pack(anchor="w", padx=25, pady=(5, 15))
        db_radio.configure(state="disabled")

        # Archivo
        frame_file = ctk.CTkFrame(self)
        frame_file.pack(fill="x", padx=20, pady=10)
        ctk.CTkLabel(frame_file, text="2. SELECCIONAR ARCHIVO", font=ctk.CTkFont(weight="bold", size=12)).pack(anchor="w", padx=15, pady=(15, 5))
        
        file_inner = ctk.CTkFrame(frame_file, fg_color="transparent")
        file_inner.pack(fill="x", padx=15, pady=(0, 10))
        self.file_path_var = ctk.StringVar(value="Ningún archivo seleccionado")
        ctk.CTkLabel(file_inner, textvariable=self.file_path_var, text_color="gray", wraplength=280, justify="left").pack(side="left", padx=(10,0))
        ctk.CTkButton(file_inner, text="Examinar...", command=self.browse_file, width=100, height=30).pack(side="right")

        # Botón para bajar cambios de la nube al Excel
        ctk.CTkButton(
            frame_file, 
            text="⬇ DESCARGAR / ACTUALIZAR EXCEL CON LA NUBE", 
            command=self.download_from_cloud, 
            fg_color="#1f538d", 
            hover_color="#14375e",
            height=32,
            font=ctk.CTkFont(weight="bold", size=11)
        ).pack(fill="x", padx=15, pady=(0, 15))

        # Intervalo
        frame_int = ctk.CTkFrame(self)
        frame_int.pack(fill="x", padx=20, pady=10)
        ctk.CTkLabel(frame_int, text="3. INTERVALO (Segundos):").pack(side="left", padx=15, pady=15)
        self.interval_entry = ctk.CTkEntry(frame_int, width=80)
        self.interval_entry.insert(0, "60")
        self.interval_entry.pack(side="right", padx=15, pady=15)

        # Botón Acción
        self.start_btn = ctk.CTkButton(self, text="▶ INICIAR SINCRONIZACIÓN AUTOMÁTICA", command=self.toggle_sync, height=45, font=ctk.CTkFont(weight="bold", size=14), fg_color="#00ff66", text_color="black", hover_color="#00d957")
        self.start_btn.pack(fill="x", padx=20, pady=(15, 5))

        # Log
        ctk.CTkLabel(self, text="Consola de Actividad:", text_color="gray", font=ctk.CTkFont(size=11)).pack(anchor="w", padx=20)
        self.log_text = ctk.CTkTextbox(self, height=100, state="disabled", font=ctk.CTkFont(family="Consolas", size=11), fg_color="#1e1e1e")
        self.log_text.pack(fill="x", padx=20, pady=(0, 20))
        
        self.log("Agente configurado y listo para iniciar.")

    def log(self, message):
        self.log_text.configure(state="normal")
        t = time.strftime("%H:%M:%S")
        self.log_text.insert("end", f"[{t}] {message}\n")
        self.log_text.see("end")
        self.log_text.configure(state="disabled")

    def browse_file(self):
        filename = filedialog.askopenfilename(
            title="Seleccionar Inventario",
            filetypes=(("Archivos Excel", "*.xlsx;*.xls"), ("Todos los archivos", "*.*"))
        )
        if filename:
            self.file_path_var.set(filename)

    def download_from_cloud(self):
        try:
            url = self.url.rstrip("/") + "/sync/template"
            headers = {"X-Admin-PIN": self.pin}
            self.log("Descargando inventario actualizado de la nube...")
            r = requests.get(url, headers=headers, timeout=20)
            if r.status_code == 200:
                current_path = self.file_path_var.get()
                if not current_path or current_path == "Ningún archivo seleccionado":
                    current_path = os.path.join(os.path.expanduser("~"), "Desktop", "inventario_demo.xlsx")
                    self.file_path_var.set(current_path)
                with open(current_path, "wb") as f:
                    f.write(r.content)
                self.log(f"ÉXITO: Excel local actualizado ({os.path.basename(current_path)}).")
                messagebox.showinfo("Éxito", f"Tu archivo Excel ha sido actualizado con los datos de la nube:\n\n{current_path}")
            else:
                self.log(f"ERROR: No se pudo descargar el Excel ({r.status_code})")
        except Exception as e:
            self.log(f"FALLO DE RED: {e}")

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
        self.start_btn.configure(text="■ DETENER SINCRONIZACIÓN", fg_color="#ff4444", hover_color="#cc0000", text_color="white")
        self.log("Sincronizador INICIADO...")
        
        self.thread = threading.Thread(target=self.sync_loop, daemon=True)
        self.thread.start()

    def stop_sync(self):
        self.is_running = False
        self.start_btn.configure(text="▶ INICIAR SINCRONIZACIÓN AUTOMÁTICA", fg_color="#00ff66", hover_color="#00d957", text_color="black")
        self.log("Sincronizador DETENIDO.")

    def sync_loop(self):
        while self.is_running:
            self.perform_sync()
            for _ in range(self.interval):
                if not self.is_running:
                    break
                time.sleep(1)

    def perform_sync(self):
        self.log("Enviando cambios a la nube...")
        url = self.url.rstrip("/") + "/sync/from-excel"
        headers = {"X-Admin-PIN": self.pin}
        filepath = self.file_path_var.get()

        try:
            with open(filepath, "rb") as f:
                files = {"file": (os.path.basename(filepath), f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
                response = requests.post(url, headers=headers, files=files, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log(f"ÉXITO: {data.get('message', 'Inventario sincronizado')}")
                else:
                    self.log(f"AVISO: {data.get('message', 'No se actualizaron todos los items')}")
            else:
                self.log(f"ERROR {response.status_code}: {response.text[:60]}")
        except Exception as e:
            self.log(f"FALLO DE RED: {str(e)[:50]}...")

if __name__ == "__main__":
    app = InventorySyncDesktop()
    app.mainloop()
