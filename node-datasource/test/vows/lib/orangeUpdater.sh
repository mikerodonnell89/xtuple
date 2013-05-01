cd ~/Devel/mobile/private-extensions/source/orange/database/source
psql -d production -h localhost -U admin -f init_script.sql
cd ~/Devel/mobile/xtuple/node-datasource/installer
./installer.js -h localhost -d production -u admin -p 5432 --path ../../../private-extensions/source/orange/database/orm -P