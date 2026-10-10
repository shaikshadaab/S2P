# Shakeel Online Services — SOS Print सेटअप गाइड (सरल हिंदी में)

यह गाइड आपकी दुकान (**Shakeel Online Services, Guntur**) के लिए SOS Print सिस्टम को लाइव करने के सभी चरण समझाती है।  
**सुरक्षा नियम:** कोई भी पासवर्ड, API Key या Private Key चैट में मत भेजिए। इन्हें सीधे Vercel या .env.local फ़ाइल में सुरक्षित भरा जाता है।

---

## भाग 1: Firebase सेटअप (डेटाबेस और फ़ाइल स्टोरेज)

1. **Firebase Console खोलें:**
   - अपने ब्राउज़र में [https://console.firebase.google.com/](https://console.firebase.google.com/) पर जाएं।
   - **Add Project** पर क्लिक करें और नाम रखें (जैसे: shakeel-online-services).
   - Google Analytics को छोड़ (disable) कर प्रोजेक्ट बनाएं।

2. **Authentication चालू करें:**
   - बाएं मेनू में **Build > Authentication** पर जाएं और **Get Started** दबाएं।
   - **Sign-in method** में **Email/Password** को Enable (चालू) करें।
   - **Users** टैब में जाकर अपना Owner ईमेल और एक मजबूत पासवर्ड जोड़ें (जैसे: आपका मुख्य ईमेल)।

3. **Firestore Database चालू करें:**
   - बाएं मेनू में **Build > Firestore Database** पर जाएं और **Create database** दबाएं।
   - Location में भारत के नज़दीक sia-south1 (Mumbai) चुनें।
   - **Production mode** चुनें और Done दबाएं।

4. **Storage चालू करें:**
   - **Build > Storage** पर जाएं और **Get started** दबाएं।
   - Default Bucket चुनें (Blaze plan / pay-as-you-go की आवश्यकता होती है temporary documents के लिए)।

5. **Web App Config निकालें:**
   - Project Settings (गियर आइकन ⚙️) में जाएं।
   - नीचे स्क्रॉल करके **Add app** (वेब </>) चुनें, नाम SOS Print Web रखें।
   - आपको ये 5 मान मिलेंगे:
     - piKey
     - uthDomain
     - projectId
     - storageBucket
     - ppId

6. **Firebase Admin Service Account Key डाउनलोड करें:**
   - Project Settings में **Service accounts** टैब पर जाएं।
   - **Generate new private key** बटन पर क्लिक करें। एक .json फ़ाइल डाउनलोड होगी।
   - इसमें से client_email और private_key Vercel में इस्तेमाल होंगे। (यह फ़ाइल किसी को न दें)।

---

## भाग 2: Vercel पर वेबसाइट डिप्लॉयमेंट

0. **GitHub रिपॉजिटरी:**
   - कोड दो GitHub रिपॉजिटरी में सिंक है:
     - `https://github.com/shaikshadaab/shakeel123.git` (मुख्य डिप्लॉयमेंट रेपो)
     - `https://github.com/shaikshadaab/SOS Print.git` (बैकअप / ओरिजिन)

1. **Vercel में लॉगिन करें:**
   - [https://vercel.com/](https://vercel.com/) पर जाएं और GitHub अकाउंट से लॉगिन करें।
2. **प्रोजेक्ट इम्पोर्ट करें:**
   - **Add New... > Project** पर क्लिक करें और इस रिपॉजिटरी को चुनें।
   - Root Directory में pps/web चुनें।
3. **Environment Variables भरें (Settings में):**
   - NEXT_PUBLIC_APP_URL = https://your-domain.vercel.app (डिप्लॉय होने के बाद का URL)
   - NEXT_PUBLIC_FIREBASE_API_KEY = (Firebase से मिला apiKey)
   - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = (Firebase से मिला authDomain)
   - NEXT_PUBLIC_FIREBASE_PROJECT_ID = (Firebase से मिला projectId)
   - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = (Firebase से मिला storageBucket)
   - NEXT_PUBLIC_FIREBASE_APP_ID = (Firebase से मिला appId)
   - FIREBASE_PROJECT_ID = (Firebase projectId)
   - FIREBASE_CLIENT_EMAIL = (Service account json से client_email)
   - FIREBASE_PRIVATE_KEY = (Service account json से private_key — पूरी चाबी)
   - RAZORPAY_KEY_ID = (आपके Razorpay का Test/Live Key ID)
   - RAZORPAY_KEY_SECRET = (आपके Razorpay का Key Secret)
   - RAZORPAY_WEBHOOK_SECRET = (Webhook के लिए कोई भी गुप्त पासवर्ड)
4. **Deploy बटन दबाएं:**
   - आपकी वेबसाइट तैयार हो जाएगी।

---

## भाग 3: Razorpay Webhook जोड़ना

1. Razorpay Dashboard खोलें: [https://dashboard.razorpay.com/](https://dashboard.razorpay.com/)
2. **Settings > Webhooks** पर जाएं और **Add New Webhook** दबाएं।
3. Webhook URL में डालें: https://YOUR-VERCEL-DOMAIN/api/payments/webhook
4. Secret में वही गुप्त पासवर्ड डालें जो Vercel के RAZORPAY_WEBHOOK_SECRET में डाला था।
5. Events में चुनें: payment.captured, order.paid, payment.failed।

---

## भाग 4: दुकान के Windows PC पर Agent और Controlled Test चालू करना

1. **दुकान का मुख्य Windows PC:**
   - PC चालू रखें, Windows में लॉगिन रहें और इंटरनेट कनेक्टेड रखें।
   - अपने B&W या Colour प्रिंटर (USB/Network HP Printer) का सामान्य Windows Driver चालू रखें।
   - Windows Settings > Printers से एक सादा **Windows Test Page** प्रिंट करके पुष्टि करें कि केबल और कागज़ ठीक हैं।

2. **Windows Agent डाउनलोड और Pair करना:**
   - वेबसाइट से नवीनतम Agent डाउनलोड करें: [https://sos-print.vercel.app/SOS-Print-Agent-Package.zip](https://sos-print.vercel.app/SOS-Print-Agent-Package.zip) (Size: 14.5 MB).
   - इस ZIP को किसी अलग फोल्डर (जैसे `C:\\SOSPrint-Agent`) में **Extract All** (अनज़िप) करें।
   - ब्राउज़र में Owner Dashboard के [Printers](https://sos-print.vercel.app/dashboard/printers) पेज पर जाएं।
   - **"Generate Pairing Code"** बटन दबाएं। 6 अंकों का सुरक्षित कोड मिलेगा (जैसे: 849201).
   - Agent फोल्डर में जाकर **`pair-agent.bat`** पर डबल-क्लिक करें।
   - प्रॉम्प्ट में वही 6-अंकों का कोड डालें। Agent तुरंत सर्वर से सुरक्षित DPAPI चाबी के साथ पेयर हो जाएगा।

3. **Controlled Commissioning Test Print (ग्राहक ऑर्डर अभी बंद रहेंगे):**
   - अगर Agent पहले से बैकग्राउंड में नहीं चल रहा, तो **`start-agent.bat`** चलाएं। (ध्यान दें: एक समय पर केवल एक ही Agent instance खुला रखें).
   - Dashboard के [Printers](https://sos-print.vercel.app/dashboard/printers) पेज पर जाकर **"Send 1-Page Test Print (A4 B&W)"** बटन दबाएं।
   - यह टेस्ट ऑर्डर खास तौर पर Owner के लिए बनाया गया है, जो **Public Intake Paused** होने के बावजूद सुरक्षित टेस्ट जॉब कतार में भेजता है।
   - Agent तुरंत इस 1-पन्ने की सुरक्षित टेस्ट PDF (`test_visible_a4.pdf`) को उठाएगा और आपके HP प्रिंटर से प्रिंट करेगा।
   - प्रिंटर से निकला हुआ असली कागज़ हाथ में देखें। कागज़ पर स्पष्ट शीर्षक "SOS PRINT - CONTROLLED COMMISSIONING TEST PRINT", A4, B&W और समय अंकित होगा।
   - Counter स्क्रीन (`/dashboard/counter`) पर भी यह ऑर्डर "Commissioning Test" बैज के साथ दिखाई देगा।

4. **दुकान ग्राहकों के लिए खोलना:**
   - जब दुकान के असली प्रिंटर से कागज़ सफलतापूर्वक निकल जाए, तब Dashboard के **Settings** में जाकर **Resume Intake** (दुकान चालू) करें।
   - अब ग्राहक काउंटर पर लगे QR से निर्बाध प्रिंटिंग कर सकेंगे।

## भाग 5: असली टेस्ट (QR से प्रिंट तक)

1. डैशबोर्ड से **Standee & QR** डाउनलोड करें।
2. अपने मोबाइल से उस QR को स्कैन करें।
3. मोबाइल पर एक छोटा PDF या फोटो अपलोड करें।
4. रेट्स और पेज चेक करके पेमेंट चुनें:
   - पहले **Cash at counter** चुनें। डैशबोर्ड पर जाकर **Confirm Payment** दबाएं।
   - देखें कि दुकान के प्रिंटर से पन्ना निकलता है या नहीं।
5. इसके बाद Razorpay Test Mode से ₹1 का टेस्ट पेमेंट करके ऑटोमैटिक प्रिंटिंग की जांच करें।
6. जब सब कुछ ठीक निकले, तब दुकान में स्टैंडी काउंटर पर लगाएं और लाइव करें!