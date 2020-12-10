cp -r public/* docs/
sed -i "s+href='/+href='+g" docs/index.html
sed -i "s+src='/+src='+g" docs/index.html