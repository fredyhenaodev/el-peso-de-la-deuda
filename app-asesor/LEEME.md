# F&T Asesorías · Mis clientes

App para el asesor. Guarda la asesoría de cada persona o pareja, cada encuentro y tus notas.
Los datos quedan en una hoja de Google Sheets de tu Drive. Solo tú puedes entrar, con tu cuenta de Google.

## Instalar (una sola vez, unos 10 minutos, en el computador)

1. En Google Drive crea una hoja de cálculo nueva y llámala **F&T Asesorías · Clientes**.
2. En la hoja, entra a **Extensiones › Apps Script**.
3. En el archivo `Código.gs` borra todo y pega el contenido de **Codigo.gs**.
4. Toca **+** (Archivos) › **HTML**, ponle de nombre `Index` y pega el contenido de **Index.html**.
5. Otra vez **+** › **HTML**, nombre `Asesoria` (sin tilde), y pega el contenido de **Asesoria.html**.
6. Guarda con el ícono del disquete.
7. Arriba a la derecha: **Implementar › Nueva implementación**.
   - Tipo: **Aplicación web**.
   - Ejecutar como: **Yo**.
   - Quién tiene acceso: **Solo yo**.
   - Toca **Implementar** y luego **Autorizar acceso** con tu cuenta.
   - Si sale “Google no ha verificado esta app”, toca **Configuración avanzada › Ir a … (no seguro)**. Es tu propia app, así que es seguro.
8. Copia la **URL de la aplicación web** (termina en `/exec`). Esa es tu app.
9. En el celular, abre esa URL en Chrome o Safari y usa **Añadir a pantalla de inicio** para tenerla como un ícono.

Las pestañas **Clientes** y **Encuentros** se crean solas la primera vez que abres la app.

## Cuando cambie la asesoría

Si actualizamos el plan de la asesoría, vuelve a copiar **Asesoria.html** (y los otros archivos que cambien).
Luego ve a **Implementar › Administrar implementaciones**, toca el lápiz y en Versión elige **Nueva versión**.
Así la URL sigue siendo la misma.

## Cómo se usa

- **+ Nuevo cliente**: nombre, WhatsApp, si es pareja o una persona y la fecha de la asesoría.
- **Hacer la asesoría / Abrir asesoría**: es el mismo plan de siempre. Se guarda solo mientras escribes (arriba dice “Guardado ✓”).
- **Registrar encuentro**: fecha, cuál de los 5 encuentros, cuánto deben hoy, las cuatro preguntas de la guía, notas, nuevos compromisos y la próxima fecha.
- La lista muestra primero a quienes tienen el encuentro más cercano. La ficha muestra cuánto han pagado.

## Privacidad

La información financiera de tus clientes queda solo en tu Google Drive. No compartas la hoja ni cambies el acceso de la app a “Cualquier persona”.
