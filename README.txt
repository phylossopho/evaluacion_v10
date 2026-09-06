Evaluación Interactiva HTML5 / JS (v9)
Este proyecto es una aplicación web interactiva diseñada para realizar evaluaciones y repasos por bloques y temas a partir de archivos en formato JSON. Incluye soporte para modo claro/oscuro, temporizadores, métricas por tema, reproducción de audio y pantallas de descanso automatizadas.

📋 Guía de Uso de la Aplicación
Cargar Evaluación:

Abre el archivo index.html en cualquier navegador web.

Haz clic en el botón "📂 Cargar archivo de evaluación (.json)" y selecciona uno o varios archivos JSON estructurados con las preguntas.

Elige la materia cargada en la lista y presiona el botón para continuar.

Selección de Bloques y Temas:

Marca las casillas de los bloques o temas específicos que deseas evaluar.

Selecciona el número de preguntas a responder en el menú desplegable.

Haz clic en "Iniciar Evaluación".

Desarrollo del Quiz:

Responde cada pregunta haciendo clic en la opción que consideres correcta.

Respuesta correcta: Se reproduce un sonido de acierto, aparece el icono 🔥 y avanza a la siguiente pregunta tras una breve transición.

Respuesta incorrecta: La pregunta se desvanecerá directamente (fade-out / fade-in) sin mostrar resaltados en rojo ni retrasos adicionales.

Descanso Visual:

Si la sesión supera los 10 minutos continuos, la aplicación mostrará automáticamente una pantalla de reposo visual de 1 minuto para descansar la vista.

Resultados y Diagnóstico:

Al finalizar, se muestra el tiempo total, la mejor racha de aciertos y una medalla de desempeño.

Se incluye una lista de temas a reforzar basada en los errores cometidos o en las preguntas donde tardaste más de 10 segundos en responder.

⚙️ Guía de Personalización y Modificaciones
Para personalizar el aspecto visual, tiempos o sonidos de la aplicación, abre el proyecto en tu editor de código (como VS Code) y utiliza la combinación de teclas Ctrl + F para buscar los textos o variables indicados a continuación.

1. Colores y Estilos (styles.css)
Presiona Ctrl + F en styles.css para ubicar el bloque :root (Modo Oscuro) o [data-theme="light"] (Modo Claro) y cambia los códigos hexadecimales según tus gustos:

Fondo general de la app:

Busca: --bg-main:

Modifica el color del fondo principal.

Fondo de las tarjetas principales:

Busca: --card-bg:

Modifica el contenedor de la aplicación.

Fondo de bloques y métricas:

Busca: --block-bg:

Fondo de los botones de respuesta:

Busca: --item-bg:

Color de los textos:

Busca: --text-main: (Texto principal)

Busca: --text-muted: (Texto secundario / atenuado)

Color de acierto (Efecto 🔥):

Busca: --fire-bg: y --fire-border:

2. Tiempos de Transición y Sonidos (app.js)
A. Cambiar velocidad de avance entre preguntas
Presiona Ctrl + F en app.js y busca: handleAnswer

Ubicación del código:

JavaScript
setTimeout(() => {
  advanceToNextQuestion();
}, isCorrect ? 135 : 30);
135: Tiempo en milisegundos que se muestra la opción correcta (con la animación 🔥) antes de pasar a la siguiente pregunta. Reduce este valor si deseas mayor velocidad.

30: Tiempo en milisegundos al seleccionar una respuesta incorrecta (transición casi instantánea).

B. Cambiar la animación de desvanecimiento (Fade)
Presiona Ctrl + F en app.js y busca: advanceToNextQuestion

Ubicación del código:

JavaScript
setTimeout(() => {
  currentQuestionIndex++;
  ...
}, 75);
75: Duración en milisegundos del efecto de desvanecimiento (fade-out / fade-in) al cambiar de pregunta.

C. Ajustar tono o duración del sonido sintético
Presiona Ctrl + F en app.js y busca: playSyntheticSuccessSound

Duración del sonido: Cambia el valor 0.075 por un número mayor para que el pitido dure más tiempo (ejemplo: 0.1).

Velocidad de audio subido (.mp3/.wav): En playCorrectSound, modifica audioEl.playbackRate = 1.33; (valores más altos aceleran el audio).

D. Ajustar el icono o emojis
Icono de acierto: Presiona Ctrl + F, busca fireSpan.textContent = '🔥'; y reemplázalo por el emoji de tu preferencia.

Tiempo para activar la pantalla de reposo: Presiona Ctrl + F, busca 600000 (representa 10 minutos en milisegundos) y modifícalo si deseas que el descanso salte antes o después.