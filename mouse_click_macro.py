"""
Macro de Click con Rafagas Configurables
Autor: Inventory Sync Team
Fecha: 2026

Descripción:
Este script permite configurar rafagas de clics automáticos en el botón izquierdo
del mouse, con la opción de "blindar" una tecla específica. Cuando se presiona
esa tecla blindada, la macro ejecuta las rafagas configurables.

Funcionalidades:
- Configurar número de clics por rafaga
- Configurar delay entre rafagas (en segundos)
- Blindar una tecla específica (al presionarla, inicia el clickeo)
- Al presionar la tecla blindada nuevamente, detiene la macro
- Visualización en tiempo real del estado

Requisitos:
- Python 3.x
- Biblioteca pynput (pip install pynput)

Uso:
1. Ejecutar el script
2. Configurar los parámetros en la consola o mediante el menú interactivo
3. Presionar la tecla blindada para iniciar/ Detener el clickeo automático
4. Presionar 'ESC' en cualquier momento para detener la macro de emergencia
"""

import time
import sys
import threading
from pynput import keyboard, mouse

# Configuración global
config = {
    "clicks_per_raga": 5,        # Número de clics por rafaga
    "delay_between_clicks": 0.05, # Delay entre cada clic (segundos)
    "blind_key": None,           # Tecla a blindar (None = desactivado)
    "is_running": False,         # Estado de la macro
    "stop_event": threading.Event(), # Evento para detener emergente
}

def get_blind_key_from_user():
    """Solicita al usuario que presione la tecla que quiere blindar."""
    print("=" * 60)
    print("CONFIGURACIÓN DE TECLA BLINDEADA")
    print("=" * 60)
    print("Por favor, presiona la tecla que deseas usar para activar")
    print("la macro de clics automáticos.")
    print("⚠️  IMPORTANTE: No presiones ESC ni Ctrl+C aún.")
    print()
    
    collected_key = [None]
    
    def on_press(key):
        try:
            # Intentamos obtener el nombre normalizado de la tecla
            key_name = key.char
        except AttributeError:
            # Para teclas especiales, mapeamos las más comunes
            special_keys = {
                'Key.esc': 'ESC',
                'Key.shift': 'SHIFT',
                'Key.ctrl_l': 'CTRL',
                'Key.ctrl_r': 'CTRL',
                'Key.alt_l': 'ALT',
                'Key.alt_r': 'ALT',
                'Key.cmd': 'WIN',
                'Key.tab': 'TAB',
                'Key.ctrl': 'CTRL',
                'Key.alt': 'ALT',
                'Key.shift_r': 'SHIFT',
            }
            key_name = special_keys.get(str(key), str(key))
        
        print(f"✅ Tecla detectada: {key_name}")
        collected_key[0] = key_name
        return False  # Detener el listener
    
    # Iniciamos el listener para capturar una tecla
    with keyboard.Listener(on_press=on_press) as listener:
        listener.join()
    
    return collected_key[0]

def on_press_handler(key):
    """Manejador de eventos de teclado principal."""
    global config, is_running
    
    try:
        key_char = key.char
    except AttributeError:
        key_char = str(key)
    
    # Verificar si se presionó la tecla de escape para emergencia
    if key_char == 'esc' or key_char == 'Key.esc':
        config["is_running"] = False
        config["stop_event"].set()
        print("\n🛑 Macro detenida emergentemente (ESC presionado)")
        return False
    
    # Verificar si se presionó la tecla blindada
    if config["blind_key"] and key_char == config["blind_key"]:
        config["is_running"] = not config["is_running"]
        
        if config["is_running"]:
            print(f"\n▶️  Macro INICIADA - Tecla blindada: {config['blind_key']}")
            print(f"   Clics por rafaga: {config['clicks_per_raga']}")
            print(f"   Delay entre clics: {config['delay_between_clicks']}s")
            print("🛑 Presiona la tecla blindada nuevamente para DETENER")
            print("⚠️  Presiona ESC en cualquier momento para detener emergente")
        else:
            print(f"\n⏸️  Macro DETENIDA - Tecla blindada: {config['blind_key']}")
    
    return True

def click_mouse():
    """Función para ejecutar un clic en el botón izquierdo."""
    try:
        with mouse.Controller() as mouse_ctrl:
            mouse_ctrl.click(mouse.Button.left)
        return True
    except Exception as e:
        print(f"❌ Error al hacer clic: {e}")
        return False

def run_raga():
    """Ejecuta una rafaga de clics configurable."""
    clicks = config["clicks_per_raga"]
    delay = config["delay_between_clicks"]
    
    for i in range(clicks):
        # Verificar si debe detenerse
        if config["stop_event"].is_set():
            return False
        
        # Hacer clic
        click_mouse()
        
        # Delay entre clics (si no es el último)
        if i < clicks - 1:
            time.sleep(delay)
    
    return True

def main():
    global config
    
    print("=" * 60)
    print("🖱️  MACRO DE CLICK CON RAFAGAS CONFIGURABLES")
    print("=" * 60)
    print()
    
    # Solicitar configuración de la tecla blindada
    blind_key = get_blind_key_from_user()
    
    if not blind_key:
        print("❌ No se detectó ninguna tecla. Saliendo...")
        sys.exit(1)
    
    # Configurar la tecla blindada
    config["blind_key"] = blind_key
    
    # Solicitar configuración de parámetros
    print()
    print("=" * 60)
    print("CONFIGURACIÓN DE RAFAGAS")
    print("=" * 60)
    
    while True:
        try:
            clicks_input = input(f"Número de clics por rafaga [{config['clicks_per_raga']}]: ")
            if clicks_input.strip():
                config["clicks_per_raga"] = int(clicks_input)
                if config["clicks_perraga"] < 1:
                    print("⚠️  El número debe ser al menos 1. Usando valor por defecto.")
                    config["clicks_per_raga"] = 5
                break
        except ValueError:
            print("❌ Por favor ingresa un número válido.")
    
    while True:
        try:
            delay_input = input(f"Delay entre clics (segundos) [{config['delay_between_clicks']}]: ")
            if delay_input.strip():
                config["delay_between_clicks"] = float(delay_input)
                if config["delay_between_clicks"] < 0:
                    print("⚠️  El delay no puede ser negativo. Usando valor por defecto.")
                    config["delay_between_clicks"] = 0.05
                break
        except ValueError:
            print("❌ Por favor ingresa un número válido.")
    
    print()
    print("=" * 60)
    print("📋 RESUMEN DE CONFIGURACIÓN")
    print("=" * 60)
    print(f"🔑 Tecla blindada: {config['blind_key']}")
    print(f"🔢 Clics por rafaga: {config['clicks_per_raga']}")
    print(f"⏱️  Delay entre clics: {config['delay_between_clicks']}s")
    print()
    print("🎯 INSTRUCCIONES:")
    print("  • Presiona la tecla blindada para INICIAR/RECICLAR la macro")
    print("  • Presiona la tecla blindada nuevamente para DETENER")
    print("  • Presiona ESC en cualquier momento para detener emergente")
    print()
    print("▶️  PREPARANDO SISTEMA...")
    print()
    
    # Configurar listeners
    config["is_running"] = False
    config["stop_event"] = threading.Event()
    
    # Configurar listener de teclado
    key_listener = keyboard.Listener(
        on_press=on_press_handler,
        on_release=lambda key: key_char == 'esc' if hasattr(key, 'char') else False
    )
    
    # Configurar listener de mouse (solo para lectura de estado)
    mouse_listener = mouse.Listener()
    
    try:
        key_listener.start()
        print("✅ System ready. Waiting for blind key...")
        print()
        print("=" * 60)
        print("🔧 CONFIGURACIÓN COMPLETA")
        print("=" * 60)
        print()
        
        # Mantener el script corriendo
        while True:
            time.sleep(0.1)
            # Verificar si se presionó la tecla de escape manualmente
            if not config["is_running"] and config["stop_event"].is_set():
                break
                
    except KeyboardInterrupt:
        print("\n🛑 Script interrumpido por el usuario")
    finally:
        config["is_running"] = False
        config["stop_event"].set()
        if key_listener.is_alive():
            key_listener.stop()
        if mouse_listener.is_alive():
            mouse_listener.stop()
        print("\n🧹 Limpieza completada. Saliendo...")

if __name__ == "__main__":
    main()