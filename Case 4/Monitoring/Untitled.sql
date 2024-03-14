use EdgeEmulator;

Drop table subscriber;

CREATE TABLE subscriber (
	id int(11) NOT NULL AUTO_INCREMENT,
	deviceValue float NOT NULL,
	deviceParameter varchar(30) NOT NULL,
	deviceId varchar(15) NOT NULL,
	dateTime DATETIME,
	PRIMARY KEY (id)
); 

INSERT INTO subscriber VALUES (null,34.5831,'Temperature','SBS05',"2021-03-11, 6:24:42");


Select * from subscriber;



CREATE TABLE cloudClient (
	id int(11) NOT NULL AUTO_INCREMENT,
	deviceValueAvarage float NOT NULL,
	deviceParameter varchar(30) NOT NULL,
	deviceId varchar(15) NOT NULL,
	dateTime DATETIME,
	PRIMARY KEY (id)
); 