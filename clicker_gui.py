""" 
Macro de Click Global con Interfaz Gráfica Tkinter
Funciona en segundo plano con modo MANTENER PRESIONADO
CLICK CONTINUO E INFINITO mientras el botón esté presionado
OPTIMIZADO PARA VELOCIDAD MÁXIMA - Sin delays artificiales
"""

import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time
from pynput import keyboard, mouse
import sys
import os

class ClickerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("🖱️ Macro de Click Global - Inventory Sync")
        self.root.geometry("420x650")
        self.root.resizable(False, False)
        
        # Configuración global
        self.config = {
            "delay_between_clicks": 0.05,
            "blind_key": None,
            "is_running": False,
            "global_hook_active": False,
            "hold_mode": True,
        }
        
        # Variables para captura de teclas/botones
        self.captured_key = None
        self.capturing = False
        self.capture_window = None
        self.holding = False
        self.hold_thread = None
        
        # Controlador de mouse optimizado (creado una sola vez)
        self.mouse_controller = mouse.Controller()
        
        # Listeners globales
        self.global_key_listener = None
        self.global_mouse_listener = None
        
        # Configurar ventana
        self.setup_styles()
        self.create_widgets()
        
        # Bind tecla ESC para cerrar
        self.root.bind("<Escape>", self.on_escape)
        
        # Protocolo de cierre
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
    
    def setup_styles(self):
        style = ttk.Style()
        style.theme_use('clam')
        
        # Configurar colores oscuros estilo técnico
        style.configure('TFrame', background='#0d0e12')
        style.configure('TLabel', background='#0d0e12', foreground='#ededed', font=('Consolas', 9))
        style.configure('TRadiobutton', background='#0d0e12', foreground='#ededed')
        style.configure('TButton', background='#12141a', foreground='#8e95a5', 
                       font=('Consolas', 9), borderwidth=1)
        style.map('TButton', background=[('active', '#1a1e27')])
        style.configure('Accent.TButton', background='#00ff66', foreground='#090a0c')
        style.map('Accent.TButton', background=[('active', '#00e65c')])
        style.configure('Danger.TButton', background='#ff3b00', foreground='#090a0c')
        style.map('Danger.TButton', background=[('active', '#cc2e00')])
        style.configure('Warning.TButton', background='#f59e0b', foreground='#090a0c')
        style.map('Warning.TButton', background=[('active', '#d98a09')])
    
    def create_widgets(self):
        # Frame principal
        main_frame = ttk.Frame(self.root, padding="20")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Título
        title_label = ttk.Label(main_frame, text="MACRO DE CLICK GLOBAL", 
                               font=('Consolas', 12, 'bold'))
        title_label.grid(row=0, column=0, pady=(0, 15), sticky=tk.W)
        
        # --- Sección Modo de Operación ---
        mode_frame = ttk.LabelFrame(main_frame, text="🎛️ MODO DE OPERACIÓN", padding="10")
        mode_frame.grid(row=1, column=0, sticky=(tk.W, tk.E), pady=5)
        
        # Variable para el modo
        self.mode_var = tk.StringVar(value="hold")
        
        ttk.Radiobutton(mode_frame, text="Mantener Presionado (Hold)", variable=self.mode_var, 
                       value="hold", command=self.update_mode).grid(row=0, column=0, sticky=tk.W)
        ttk.Radiobutton(mode_frame, text="Alternar (Toggle)", variable=self.mode_var, 
                       value="toggle", command=self.update_mode).grid(row=1, column=0, sticky=tk.W, pady=(5, 0))
        
        # --- Sección Tecla Blindada ---
        blind_frame = ttk.LabelFrame(main_frame, text="🔑 TECLA/BOON BLINDEADA", padding="10")
        blind_frame.grid(row=2, column=0, sticky=(tk.W, tk.E), pady=5)
        
        self.blind_key_label = ttk.Label(blind_frame, text="Ninguna seleccionada", 
                                        foreground='#f59e0b', font=('Consolas', 9))
        self.blind_key_label.grid(row=0, column=0, sticky=tk.W, columnspan=2)
        
        btn_select_key = ttk.Button(blind_frame, text="Seleccionar Tecla/Botón", 
                                   command=self.select_blind_key, style='Accent.TButton')
        btn_select_key.grid(row=1, column=0, padx=(0, 5), pady=(10, 0))
        
        btn_clear_key = ttk.Button(blind_frame, text="Limpiar", 
                                  command=self.clear_blind_key, style='Danger.TButton')
        btn_clear_key.grid(row=1, column=1, padx=(5, 0), pady=(10, 0))
        
        # --- Sección Configuración de Velocidad ---
        speed_frame = ttk.LabelFrame(main_frame, text="⚙️ CONFIGURACIÓN DE VELOCIDAD", padding="10")
        speed_frame.grid(row=3, column=0, sticky=(tk.W, tk.E), pady=5)
        
        # Delay entre clics (explicación de 30-50ms)
        ttk.Label(speed_frame, text="Delay entre clics (s):", font=('Consolas', 9)).grid(row=0, column=0, sticky=tk.W)
        self.delay_spinbox = ttk.Spinbox(speed_frame, from_=0.001, to=1.0, increment=0.001, width=10, font=('Consolas', 9))
        self.delay_spinbox.set(0.005)
        self.delay_spinbox.grid(row=0, column=1, padx=(5, 0))
        
        # Etiqueta explicativa de delay
        ttk.Label(speed_frame, text="1ms = 0.001s, 5ms = 0.005s", 
                 font=('Consolas', 8), foreground='#8e95a5').grid(row=1, column=0, columnspan=2, sticky=tk.W, pady=(5, 0))
        
        # --- Botones de control ---
        btn_frame = ttk.Frame(main_frame, padding="10")
        btn_frame.grid(row=4, column=0, sticky=(tk.W, tk.E), pady=5)
        
        self.start_btn = ttk.Button(btn_frame, text="▶ INICIAR MACRO", 
                                   command=self.toggle_macro, style='Accent.TButton')
        self.start_btn.grid(row=0, column=0, padx=(0, 10))
        
        self.stop_btn = ttk.Button(btn_frame, text="⏹ DETENER", 
                                  command=self.force_stop, state='disabled')
        self.stop_btn.grid(row=0, column=1)
        
        # --- Estado ---
        self.status_var = tk.StringVar(value="Listo para configurar")
        status_label = ttk.Label(main_frame, textvariable=self.status_var, 
                                font=('Consolas', 8))
        status_label.grid(row=5, column=0, sticky=tk.W, pady=(5, 0))
        
        # --- Información ---
        info_frame = ttk.LabelFrame(main_frame, text="ℹ️ INFORMACIÓN", padding="10")
        info_frame.grid(row=6, column=0, sticky=(tk.W, tk.E), pady=5)
        
        info_text = (
            "MODO MANTENER PRESIONADO:\n"
            "• Mantén presionado el botón para clickear INFINITAMENTE\n"
            "• Suelta el botón para detener\n"
            "• VELOCIDAD MÁXIMA sin tirones ni delays artificiales\n"
            "• Compatible con pantallas completas\n"
            "• Soporta ambos botones laterales individualmente\n\n"
            "CONFIGURACIÓN RECOMENDADA PARA SHOOTERS:\n"
            "• Delay entre clics: 0.001s (1ms) a 0.005s (5ms)\n"
            "• Botón: Cualquiera de los laterales del mouse"
        )
        info_label = ttk.Label(info_frame, text=info_text, justify=tk.LEFT,
                              font=('Consolas', 8))
        info_label.grid(row=0, column=0)
    
    def update_mode(self):
        """Actualizar modo de operación."""
        mode = self.mode_var.get()
        self.config["hold_mode"] = (mode == "hold")
        mode_text = "MANTENER PRESIONADO" if mode == "hold" else "ALTERNAR"
        self.status_var.set(f"Modo actual: {mode_text}")
    
    def select_blind_key(self):
        """Abre un diálogo para seleccionar la tecla/botón blindado."""
        if self.config["is_running"]:
            messagebox.showwarning("Advertencia", "Detén la macro primero antes de cambiar la tecla")
            return
        
        # Crear ventana secundaria para capturar tecla/botón
        self.capture_window = tk.Toplevel(self.root)
        self.capture_window.title("Seleccionar Tecla/Botón")
        self.capture_window.geometry("350x250")
        self.capture_window.resizable(False, False)
        self.capture_window.transient(self.root)
        self.capture_window.grab_set()
        
        # Centrar la ventana
        self.capture_window.update_idletasks()
        x = (self.capture_window.winfo_screenwidth() // 2) - (350 // 2)
        y = (self.capture_window.winfo_screenheight() // 2) - (250 // 2)
        self.capture_window.geometry(f"350x250+{x}+{y}")
        
        # Contenido
        ttk.Label(self.capture_window, text="Presiona la tecla o botón que quieres blindar:", 
                 font=('Consolas', 10)).pack(pady=15)
        
        self.status_capture = ttk.Label(self.capture_window, text="Esperando tecla o botón...", 
                                       foreground='#f59e0b', font=('Consolas', 9))
        self.status_capture.pack(pady=5)
        
        ttk.Label(self.capture_window, text="Presiona ESC para cancelar", 
                 font=('Consolas', 8)).pack(pady=5)
        
        # Botón para cancelar
        cancel_btn = ttk.Button(self.capture_window, text="Cancelar", command=self.cancel_capture)
        cancel_btn.pack(pady=10)
        
        # Iniciar captura
        self.capturing = True
        self.captured_key = None
        
        # Listener de teclado y mouse
        self.global_key_listener = keyboard.Listener(on_press=self._on_key_press_capture)
        self.global_mouse_listener = mouse.Listener(on_click=self._on_mouse_click_capture)
        
        self.global_key_listener.start()
        self.global_mouse_listener.start()
        
        # Timeout después de 15 segundos
        self.capture_window.after(15000, self._capture_timeout)
    
    def _on_key_press_capture(self, key):
        """Capturar teclas durante la selección."""
        if not self.capturing:
            return False
            
        try:
            key_char = key.char
        except AttributeError:
            key_char = str(key)
        
        # Verificar ESC para cancelar
        if key_char.lower() in ['esc', 'escape']:
            self.cancel_capture()
            return False
        
        # Capturar la tecla
        self.captured_key = ('keyboard', key_char)
        self.finish_capture()
        return False
    
    def _on_mouse_click_capture(self, x, y, button, pressed):
        """Capturar botones del mouse durante la selección - CORREGIDO PARA BOTONES INDIVIDUALES."""
        if not self.capturing or not pressed:
            return
            
        # Solo capturar cuando se presiona (pressed = True)
        button_name = str(button)
        print(f"Botón detectado: {button_name}")  # Para debugging
        
        # Verificar botones laterales individualmente
        if 'button.x1' in button_name.lower() or 'button4' in button_name.lower() or '<Button.x1>' in button_name:
            self.captured_key = ('mouse', 'button4')
            self.finish_capture()
        elif 'button.x2' in button_name.lower() or 'button5' in button_name.lower() or '<Button.x2>' in button_name:
            self.captured_key = ('mouse', 'button5')
            self.finish_capture()
        elif 'left' in button_name.lower():
            self.captured_key = ('mouse', 'left')
            self.finish_capture()
        elif 'right' in button_name.lower():
            self.captured_key = ('mouse', 'right')
            self.finish_capture()
    
    def finish_capture(self):
        """Finalizar la captura y mostrar resultado."""
        if not self.capturing or not self.captured_key:
            return
            
        self.capturing = False
        
        # Detener listeners
        if self.global_key_listener and self.global_key_listener.is_alive():
            self.global_key_listener.stop()
        if self.global_mouse_listener and self.global_mouse_listener.is_alive():
            self.global_mouse_listener.stop()
        
        # Mostrar resultado
        key_type, key_value = self.captured_key
        display_name = ""
        
        if key_type == 'keyboard':
            display_name = key_value
        elif key_type == 'mouse':
            if key_value == 'button4':
                display_name = "Botón Lateral 4 (Atrás)"
            elif key_value == 'button5':
                display_name = "Botón Lateral 5 (Adelante)"
            elif key_value == 'left':
                display_name = "Botón Izquierdo"
            elif key_value == 'right':
                display_name = "Botón Derecho"
            else:
                display_name = f"Botón Mouse {key_value}"
        
        # Actualizar UI
        self.config["blind_key"] = self.captured_key
        self.blind_key_label.config(text=f"🔒 {display_name}", foreground='#00ff66')
        self.status_var.set(f"Blindado: {display_name}")
        self.status_capture.config(text=f"Capturado: {display_name}", foreground='#00ff66')
        
        # Cerrar ventana de selección
        if self.capture_window and self.capture_window.winfo_exists():
            self.capture_window.destroy()
        
        messagebox.showinfo("Éxito", f"Tecla/Botón blindado: {display_name}")
    
    def clear_blind_key(self):
        """Limpiar la tecla/botón blindado."""
        self.captured_key = None
        self.blind_key_label.config(text="Ninguna seleccionada", foreground='#f59e0b')
        self.status_var.set("Tecla/botón limpiada")
    
    def cancel_capture(self):
        """Cancelar la captura."""
        if not self.capturing:
            return
            
        self.capturing = False
        
        # Detener listeners
        if self.global_key_listener and self.global_key_listener.is_alive():
            self.global_key_listener.stop()
        if self.global_mouse_listener and self.global_mouse_listener.is_alive():
            self.global_mouse_listener.stop()
        
        # Actualizar UI
        if self.status_capture and hasattr(self, 'status_capture'):
            self.status_capture.config(text="Cancelado", foreground='#ff3b00')
        
        # Cerrar ventana después de 1 segundo
        if self.capture_window and self.capture_window.winfo_exists():
            self.capture_window.after(1000, self.capture_window.destroy)
    
    def _capture_timeout(self):
        """Timeout de captura."""
        if self.capturing:
            self.cancel_capture()
            if hasattr(self, 'status_capture') and self.status_capture:
                self.status_capture.config(text="Tiempo agotado", foreground='#ff3b00')
    
    def toggle_macro(self):
        """Alternar inicio/parada de la macro."""
        if not self.config["blind_key"]:
            messagebox.showwarning("Advertencia", "Primero selecciona una tecla/botón blindado")
            return
        
        if not self.config["is_running"]:
            self.start_macro()
        else:
            self.stop_macro()
    
    def start_macro(self):
        """Iniciar la macro de clics en modo global."""
        self.config["is_running"] = True
        self.config["global_hook_active"] = True
        self.start_btn.config(state='disabled', text="⏳ Ejecutando...")
        self.stop_btn.config(state='normal')
        
        # Mostrar tecla blindada
        key_type, key_value = self.config["blind_key"]
        display_name = ""
        if key_type == 'keyboard':
            display_name = key_value
        elif key_type == 'mouse':
            if key_value == 'button4':
                display_name = "Botón Lateral 4 (Atrás)"
            elif key_value == 'button5':
                display_name = "Botón Lateral 5 (Adelante)"
            else:
                display_name = f"Botón Mouse {key_value}"
        
        mode_text = "MANTENER PRESIONADO" if self.config["hold_mode"] else "ALTERNAR"
        self.status_var.set(f"Macro activa ({mode_text}) - {display_name}")
        
        # Iniciar listeners globales
        self.global_key_listener = keyboard.Listener(
            on_press=self.on_global_key_press,
            on_release=self.on_global_key_release
        )
        self.global_mouse_listener = mouse.Listener(
            on_click=self.on_global_mouse_click
        )
        
        self.global_key_listener.start()
        self.global_mouse_listener.start()
        
        # Iniciar hilo de clics (solo para modo hold)
        if self.config["hold_mode"]:
            self.hold_thread = threading.Thread(target=self.hold_click_loop, daemon=True)
            self.hold_thread.start()
    
    def stop_macro(self):
        """Detener la macro."""
        self.config["is_running"] = False
        self.config["global_hook_active"] = False
        self.holding = False
        
        # Detener listeners
        if self.global_key_listener and self.global_key_listener.is_alive():
            self.global_key_listener.stop()
        if self.global_mouse_listener and self.global_mouse_listener.is_alive():
            self.global_mouse_listener.stop()
        
        self.start_btn.config(state='normal', text="▶ INICIAR MACRO")
        self.stop_btn.config(state='disabled')
        self.status_var.set("Macro detenida")
    
    def force_stop(self):
        """Detener emergente."""
        self.config["is_running"] = False
        self.config["global_hook_active"] = False
        self.holding = False
        
        # Detener listeners
        if self.global_key_listener and self.global_key_listener.is_alive():
            self.global_key_listener.stop()
        if self.global_mouse_listener and self.global_mouse_listener.is_alive():
            self.global_mouse_listener.stop()
        
        self.start_btn.config(state='normal', text="▶ INICIAR MACRO")
        self.stop_btn.config(state='disabled')
        self.status_var.set("Macro detenida emergente")
    
    def on_global_key_press(self, key):
        """Manejar presión de tecla global durante la macro."""
        try:
            key_char = key.char
        except AttributeError:
            key_char = str(key)
        
        # Verificar ESC para emergente
        if key_char.lower() in ['esc', 'escape']:
            self.force_stop()
            return False
        
        # Verificar tecla blindada - MODO HOLD
        if self.config["hold_mode"] and self.config["blind_key"][0] == 'keyboard' and key_char == self.config["blind_key"][1]:
            self.holding = True
            self.status_var.set("Clickeando INFINITAMENTE... (suelta para detener)")
            return True
        
        # Verificar tecla blindada - MODO TOGGLE
        if not self.config["hold_mode"] and self.config["blind_key"][0] == 'keyboard' and key_char == self.config["blind_key"][1]:
            self.config["is_running"] = not self.config["is_running"]
            
            if self.config["is_running"]:
                self.status_var.set("Macro activa - Presiona botón para detener")
                self.toggle_click_start()
            else:
                self.status_var.set("Macro detenida")
        
        return True
    
    def on_global_key_release(self, key):
        """Manejar liberación de tecla global."""
        try:
            key_char = key.char
        except AttributeError:
            key_char = str(key)
        
        # Verificar tecla blindada - MODO HOLD
        if self.config["hold_mode"] and self.config["blind_key"][0] == 'keyboard' and key_char == self.config["blind_key"][1]:
            self.holding = False
            self.status_var.set("Listo - Mantén presionado para activar")
            return True
        
        return True
    
    def on_global_mouse_click(self, x, y, button, pressed):
        """Manejar clics de mouse global durante la macro - CORREGIDO PARA BOTONES INDIVIDUALES."""
        # Verificar botones blindados - MODO HOLD
        if self.config["hold_mode"]:
            if pressed and self.config["blind_key"][0] == 'mouse':
                # Verificar Button 4 (botón lateral izquierdo)
                if self.config["blind_key"][1] == 'button4':
                    button_name = str(button).lower()
                    if 'button.x1' in button_name or 'button4' in button_name or '<button.x1>' in button_name:
                        self.holding = True
                        self.status_var.set("Clickeando INFINITAMENTE... (suelta para detener)")
                # Verificar Button 5 (botón lateral derecho)
                elif self.config["blind_key"][1] == 'button5':
                    button_name = str(button).lower()
                    if 'button.x2' in button_name or 'button5' in button_name or '<button.x2>' in button_name:
                        self.holding = True
                        self.status_var.set("Clickeando INFINITAMENTE... (suelta para detener)")
            elif not pressed and self.config["blind_key"][0] == 'mouse':
                # Verificar Button 4 (botón lateral izquierdo)
                if self.config["blind_key"][1] == 'button4':
                    button_name = str(button).lower()
                    if 'button.x1' in button_name or 'button4' in button_name or '<button.x1>' in button_name:
                        self.holding = False
                        self.status_var.set("Listo - Mantén presionado para activar")
                # Verificar Button 5 (botón lateral derecho)
                elif self.config["blind_key"][1] == 'button5':
                    button_name = str(button).lower()
                    if 'button.x2' in button_name or 'button5' in button_name or '<button.x2>' in button_name:
                        self.holding = False
                        self.status_var.set("Listo - Mantén presionado para activar")
        else:
            # MODO TOGGLE
            if pressed:
                if self.config["blind_key"][0] == 'mouse':
                    button_name = str(button).lower()
                    # Verificar Button 4
                    if self.config["blind_key"][1] == 'button4':
                        if 'button.x1' in button_name or 'button4' in button_name or '<button.x1>' in button_name:
                            self.config["is_running"] = not self.config["is_running"]
                            if self.config["is_running"]:
                                self.status_var.set("Macro activa - Presiona botón para detener")
                                self.toggle_click_start()
                            else:
                                self.status_var.set("Macro detenida")
                    # Verificar Button 5
                    elif self.config["blind_key"][1] == 'button5':
                        if 'button.x2' in button_name or 'button5' in button_name or '<button.x2>' in button_name:
                            self.config["is_running"] = not self.config["is_running"]
                            if self.config["is_running"]:
                                self.status_var.set("Macro activa - Presiona botón para detener")
                                self.toggle_click_start()
                            else:
                                self.status_var.set("Macro detenida")
    
    def hold_click_loop(self):
        """Bucle de clics continuos e infinitos OPTIMIZADO PARA VELOCIDAD MÁXIMA."""
        mouse_ctrl = self.mouse_controller
        
        while self.config["global_hook_active"]:
            if self.holding and self.config["is_running"]:
                try:
                    delay = float(self.delay_spinbox.get())
                except:
                    delay = 0.005  # Valor por defecto 5ms
                
                # Más rápido que .click() - press y release separados
                mouse_ctrl.press(mouse.Button.left)
                mouse_ctrl.release(mouse.Button.left)
                
                # Sleep preciso en vez de time.sleep pelado
                start = time.perf_counter()
                while time.perf_counter() - start < delay:
                    pass  # busy-wait, sin el jitter de Windows
            else:
                time.sleep(0.001)
    
    def toggle_click_start(self):
        """Iniciar clickeo en modo toggle."""
        def click_worker():
            mouse_ctrl = self.mouse_controller
            delay = 0.005  # Valor por defecto
            
            # Hacemos clics continuos hasta que se desactive
            while self.config["is_running"] and self.config["global_hook_active"]:
                try:
                    delay = float(self.delay_spinbox.get())
                except:
                    delay = 0.005
                
                # Más rápido que .click() - press y release separados
                mouse_ctrl.press(mouse.Button.left)
                mouse_ctrl.release(mouse.Button.left)
                
                # Sleep preciso en vez de time.sleep pelado
                start = time.perf_counter()
                while time.perf_counter() - start < delay:
                    pass  # busy-wait, sin el jitter de Windows
        
        # Iniciar en hilo separado
        worker_thread = threading.Thread(target=click_worker, daemon=True)
        worker_thread.start()
    
    def on_escape(self, event):
        """Manejar tecla ESC."""
        self.force_stop()
    
    def on_closing(self):
        """Manejar cierre de la ventana."""
        # Detener todo antes de cerrar
        self.force_stop()
        self.root.destroy()
        sys.exit(0)

def main():
    root = tk.Tk()
    app = ClickerApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()