# 🧠 Custom ML Model - Tasbeeh Keyword Spotting (Offline AI)

## 🎯 الهدف
بناء موديل ذكاء اصطناعي يعمل أوفلاين على الموبايل للتعرف على 3 كلمات فقط:

- سبحان الله
- الحمد لله
- الله أكبر
- ...

ثم استخدامه داخل تطبيق React Native باستخدام TensorFlow Lite.

---

# 🪜 1. تجهيز البيئة

## 🧰 الأدوات المطلوبة

- Python 3.9+
- TensorFlow
- Librosa
- NumPy
- Google Colab (اختياري)
- Android Studio (للدمج)

---

# 📦 2. إنشاء Dataset

## 🎤 تسجيل الصوت

- 100 إلى 300 تسجيل لكل كلمة
- WAV
- 16kHz
- 1–2 ثانية

## 📁 هيكل الملفات

dataset/
  subhan_allah/
  alhamdulillah/
  allahu_akbar/

---

# 🎵 3. استخراج MFCC

```python
import librosa

audio, sr = librosa.load("001.wav", sr=16000)

mfcc = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=13)
print(mfcc.shape)
```

---

# 🧠 4. Model

```python
import tensorflow as tf

model = tf.keras.Sequential([
    tf.keras.layers.Input(shape=(13, 32, 1)),
    tf.keras.layers.Conv2D(16, (3,3), activation='relu'),
    tf.keras.layers.MaxPooling2D(),
    tf.keras.layers.Flatten(),
    tf.keras.layers.Dense(64, activation='relu'),
    tf.keras.layers.Dense(3, activation='softmax')
])

model.compile(optimizer='adam',
              loss='sparse_categorical_crossentropy',
              metrics=['accuracy'])
```

---

# 🚀 5. Training

```python
model.fit(X_train, y_train, epochs=20, batch_size=16)
```

---

# 📦 6. TFLite

```python
converter = tf.lite.TFLiteConverter.from_keras_model(model)
tflite_model = converter.convert()

open("tasbeeh.tflite","wb").write(tflite_model)
```

---

# 📱 7. React Native

```bash
npm install react-native-fast-tflite
```

---

# 🔮 8. Prediction

```javascript
const result = model.predict(inputTensor);
```

---

# 🔢 9. Count Logic

let count = 0;
count++;
