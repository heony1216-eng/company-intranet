#!/bin/bash

echo "🚀 GitHub Pages 배포 시작..."
echo ""

# 1. 변경사항 확인
echo "📝 Git 상태 확인 중..."
git status
echo ""

# 2. 사용자에게 확인
read -p "변경사항을 커밋하시겠습니까? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "❌ 배포가 취소되었습니다."
    exit 1
fi

# 3. 커밋 메시지 입력
read -p "커밋 메시지를 입력하세요: " commit_message
if [ -z "$commit_message" ]; then
    commit_message="deploy: 업데이트 배포"
fi

# 4. Git 작업
echo ""
echo "📦 Git 커밋 중..."
git add .
git commit -m "$commit_message"

# 5. 푸시
echo ""
echo "⬆️  GitHub에 푸시 중..."
git push origin main

echo ""
echo "✅ 배포가 완료되었습니다!"
echo ""
echo "📊 배포 진행 상황을 확인하려면:"
echo "   https://github.com/사용자명/company-intranet/actions"
echo ""
echo "🌐 배포된 사이트:"
echo "   https://사용자명.github.io/company-intranet/"
echo ""
