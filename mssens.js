//Der Microservice beherrscht die Methoden POST/PUT/DELETE und GET. Der Dienst wird alleinstehend über das CLI gestartet, wobei eine Parameterübergabe nötig ist.
//Ein möglicher Startbefehl sieht wie folgt aus: 'PORT=9002 SQL_DB_Address = 10.42.0.40 SQL_DB_UN=sensor_user SQL_DB_PW=L1nux_dc SQL_DB_Name=sensor_db node mssens.js'

//Das Modul Express wird geladen. Dieses bietet die Möglichkeit, die gesamten Methoden wie post, put und get abzufangen.

var express = require('express'), 	
	app = express(),		//Dieses funktionale Modul ist im weiteren Code unter dem Namen "app" bekannt.
	port = process.env.PORT;	//Der Port wird beim Start über das CLI Interface mitgegeben.

SQL_DB_Address = process.env.SQL_DB_Address; 	//Die CLI Variablen werden hier zur Übersicht lokal referenziert.  
SQL_DB_PW = process.env.SQL_DB_PW;		
SQL_DB_Name = process.env.SQL_DB_Name;
SQL_DB_UN = process.env.SQL_DB_UN;

var mysql = require('mysql');			//Das Modul mysql wird nachgeladen.			
var moment = require('moment');			//Das Modul moment wird geladen. Dies ermöglichte mir eine einfache Formatierung von SQL Timestamps

db = mysql.createConnection({			//Die Datenbank wird geöffnet und ist im weiteren unter dem Namen "db" bekannt.
	host:SQL_DB_Address,			//Diese Daten sind ursprünglich über das CLU übergeben worden.
	user:SQL_DB_UN,
	password:SQL_DB_PW,
	database:SQL_DB_Name,
});

db.connect((err) => {				//Wenn die Datenbankverbindung nicht geöffnet werden kann, wird ein Fehler ausgegeben.
	if(err){
		console.log('Could not connect to Database, check your environment variables');	//Der Fehler wird auf der Konsole gemeldet.
		return;
		db.end((err) => {
		console.log('Closing connection');
		});
	}
	console.log('Database connection established');						//Bei Erfolg wird dieser auf der Konsole gemeldet.
});

			

app.listen(port);
console.log('MS Sensor server started on: ' + port);						//Der Port wird auf der Konsole gemeldet.

app.use(express.json());							//Das Modul Express wird angewiesen nur JSON formatierte Bodys zu verarbeiten

app.post('/sensor', function(req, res){			//Hier kommt der Code, der ausgeführt wird, wenn die Methode "POST" auf das Verzeichnis /sensor angewendet wird.
if (!req.query.sensor_name||!req.sensor_location){	
	var vSensorName=req.query.sensor_name;
	var vSensorLocation=req.query.sensor_location;
	var vSensorEnabled=req.query.sensor_enabled || 1;
	var vMyTimeStamp=moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
	var vStringReturn=vSensorName+' '+vSensorLocation+' '+vSensorEnabled+' '+vMyTimeStamp;
	var sql='INSERT INTO sensor (sensor_name,sensor_location,sensor_enabled,sensor_created) VALUES ("' + vSensorName + '","' + vSensorLocation + '","' + vSensorEnabled + '","' + vMyTimeStamp + '");';
	console.log(sql);
	db.query(sql, function(error,results){
	})

	return sendback(res,vStringReturn);
};

});


//Hier kommt der Code der ausgeführt wird, wenn ein GET ausgeführt wird. Ein GET kann auf eine ID referenzieren.
//Die Aufrufe können in unterschiedlichen Formaten erfolgen:
// '/sensor' gibt alle "enabled" Sensoren zurück
// '/sensor/7' gibt die Informationen zu Sensor 7 aus
// '/sensor?enabled=0' gibt alle nicht "enabled" Sensoren zurück


app.get('/sensor/:id?', (req, res) => {	

	var vShowEnabled=1;
	console.log(vShowEnabled);	
	
	if (req.query.enabled==0){
	vShowEnabled=0;
	}

	db.query('SELECT * FROM sensor WHERE sensor_enabled=' + vShowEnabled+ ' AND sensor_deleted=0',function(error,results,fields){
	if (error){
		sendback(res,error);
		return;
	}
		console.log(results);
		sendback(res,results);
	});
	return;
	

	var vSensor_Id=req.params.id;
	var sql='SELECT * FROM sensor WHERE sensor_id=' + vSensor_Id + ';' ; 
	db.query(sql,function(error,results,fields){
	return sendback(res,results);
	});


});

//Sensoren können auch gelöscht werden. Ähnlich IMAP wird in diesem Szenario lediglich das Flag "deleted" auf eins gesetzt.
//Ein tatsächliches Entfernen aus der Datenbank findet an dieser Stelle nicht statt.
//Syntaxbeispiel: '/sensor/7' setzt das deleted Flag von Sensor 7 auf 1
//Eine "Undelete-Methode" ist nicht vorgesehen

app.delete('/sensor/:id', (req, res) => {
	if (!req.params.id){
		return sendstatus(res,400,{error:"Missing Sensor ID"});
	};
	var sql='UPDATE sensor SET sensor_deleted=1 WHERE sensor_id="' + req.params.id + '"';
	db.query (sql, function(error,results){
		console.log(results);
	})
	return sendback(res,"Deleted Sensor " + req.params.id);
});

//Ändert sich eine Information des Sensors, wie der Name, oder der Standort, kann dies mittels der PUT Methode geschehen
//Die Änderungen werden alle per JSON im Body des Aufrufs erwartet. Als zusätzlichen Sicherungsmechanismus, muss man im Body auch
//immer erneut die Sensor_Id mitgeben, welche man auch im Request nannte. Zusätzlich muss sich mindestens ein zusätzlicher Wert im Body
//befinden.
//Beispielsyntax: '/sensor/7' ändert die Werte des Sensors 7 welche im Body anzugeben sind. 

app.put('/sensor/:id', (req, res) => {
	console.log(req.params.id + ' ' + req.body.sensor_id);
	
	if (req.params.id!=req.body.sensor_id){
	return sendstatus(res,400,{error:"Missing Sensor ID"});
	};

	var vSensor_Id=req.params.id;
	var vSensor_Name=req.body.sensor_name || null;
	var vSensor_Location=req.body.sensor_location || null;
	var vEnabled_Set = 0;
	var vSensor_Enabled = 0;
	if(typeof req.body.sensor_enabled === 'string'){
		var vSensor_Enabled=req.body.sensor_enabled;
	}
	var vSubSqlArr=[];
	var vSubSql='';
	var check_change = 0;
	if (vSensor_Name!=null){
		vSubSqlArr.push('sensor_name="' + vSensor_Name + '"');
		check_change++;
	};
	if (vSensor_Location!=null){
		vSubSqlArr.push('sensor_location="' + vSensor_Location + '"');
		check_change++;
	};
	if (vSensor_Enabled === "0" || vSensor_Enabled === "1"){
		vSubSqlArr.push('sensor_enabled="' + vSensor_Enabled + '"');
		check_change++;
	}
	if (check_change > 0){
		vSubSql=vSubSqlArr.join(', ');
		var sql='UPDATE sensor SET ' + vSubSql + ' WHERE sensor_id=' + vSensor_Id + ';';
	
		db.query (sql, function(error,results){
		})
	}
	return sendstatus(res,200,'');
})


app.options('/sensor/:id?', function(req, res){
	return sendback(res,'');
});

//Die Header in den Rückgaben sollten für CORS (Cross Origin Ressource Sharing) angepasst werden. Dies passiert hier in der Funktion senback
function sendback (res, send) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "access-control-allow-origin,content-type,accept,x-requested-wih");
	res.header("Access-Control-Allow-Methods", "POST, GET, DELETE, PUT");
	res.header("Content-Type","application/json");
	res.send(send);
}

function sendstatus(res, code, text) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "access-control-allow-origin,content-type,accept,x-requested-wih");
	res.header("Access-Control-Allow-Methods", "POST, GET, DELETE, PUT");
	res.header("Content-Type","application/json");
	res.status(code).json(text);
}
