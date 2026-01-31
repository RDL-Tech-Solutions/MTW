@echo off
echo ============================================
echo   TESTE WHATSAPP BUSINESS API
echo ============================================
echo.
echo Configuracao:
echo   Phone Number ID: 895149630357817
echo   Numero de teste: 5571999541560
echo.
echo Enviando mensagem de teste...
echo.

curl -X POST "https://graph.facebook.com/v22.0/895149630357817/messages" ^
  -H "Authorization: Bearer EAAMm3AW5otcBQm8syJHykoo2ZARdZC5T6ZB16fzkmmWmziw026Q6qkHsBAN8IkcPK6CUfHZARaa0T3ctjZACZBxQilUZCKu8QUvbofzr0DmaVp28V2dkbWsLiVXjN22rBsOu3wFSZBnwSqY6W4NqHNLD9L0yq2sUsKqBUMmapbTCddfqPoLQVCMkAWVzZBh7Q5K7ILFVCpGDxTF9qHqgQnB2KrZCByCf8jneLaAr8vvGMjfGvL0TibfnrY0Feqa1DATYo6LaeJA3AfEknVTFtkWjSBB96c" ^
  -H "Content-Type: application/json" ^
  -d "{\"messaging_product\":\"whatsapp\",\"to\":\"5571999541560\",\"type\":\"template\",\"template\":{\"name\":\"hello_world\",\"language\":{\"code\":\"en_US\"}}}"

echo.
echo.
echo ============================================
echo   Verifique o WhatsApp: 71 99954-1560
echo ============================================
pause
