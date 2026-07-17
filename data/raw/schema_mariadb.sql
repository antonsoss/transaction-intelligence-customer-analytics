-- CTU Prague Financial (Berka) source schema
-- Retrieved at 2026-07-17T05:45:37.075352+00:00
SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE `account` (
  `account_id` int(11) NOT NULL DEFAULT 0,
  `district_id` int(11) NOT NULL DEFAULT 0,
  `frequency` varchar(18) NOT NULL,
  `date` date NOT NULL,
  PRIMARY KEY (`account_id`),
  KEY `district_id` (`district_id`),
  CONSTRAINT `account_ibfk_1` FOREIGN KEY (`district_id`) REFERENCES `district` (`district_id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci ROW_FORMAT=COMPACT;

CREATE TABLE `card` (
  `card_id` int(11) NOT NULL DEFAULT 0,
  `disp_id` int(11) NOT NULL,
  `type` varchar(7) NOT NULL,
  `issued` date NOT NULL,
  PRIMARY KEY (`card_id`),
  KEY `disp_id` (`disp_id`),
  CONSTRAINT `card_ibfk_1` FOREIGN KEY (`disp_id`) REFERENCES `disp` (`disp_id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci ROW_FORMAT=COMPACT;

CREATE TABLE `client` (
  `client_id` int(11) NOT NULL,
  `gender` varchar(1) NOT NULL,
  `birth_date` date NOT NULL,
  `district_id` int(11) NOT NULL,
  PRIMARY KEY (`client_id`),
  KEY `district_id` (`district_id`),
  CONSTRAINT `client_ibfk_1` FOREIGN KEY (`district_id`) REFERENCES `district` (`district_id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci ROW_FORMAT=COMPACT;

CREATE TABLE `disp` (
  `disp_id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `type` varchar(9) NOT NULL,
  PRIMARY KEY (`disp_id`),
  KEY `client_id` (`client_id`),
  KEY `account_id` (`account_id`),
  CONSTRAINT `disp_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `account` (`account_id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `disp_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `client` (`client_id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci ROW_FORMAT=COMPACT;

CREATE TABLE `district` (
  `district_id` int(11) NOT NULL DEFAULT 0,
  `A2` varchar(19) NOT NULL,
  `A3` varchar(15) NOT NULL,
  `A4` int(20) NOT NULL,
  `A5` int(11) NOT NULL,
  `A6` int(11) NOT NULL,
  `A7` int(11) NOT NULL,
  `A8` int(6) NOT NULL,
  `A9` int(11) NOT NULL,
  `A10` decimal(4,1) NOT NULL,
  `A11` int(11) NOT NULL,
  `A12` decimal(4,1) DEFAULT NULL,
  `A13` decimal(3,2) NOT NULL,
  `A14` int(11) NOT NULL,
  `A15` int(5) DEFAULT NULL,
  `A16` int(11) NOT NULL,
  PRIMARY KEY (`district_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci ROW_FORMAT=COMPACT;

CREATE TABLE `loan` (
  `loan_id` int(11) NOT NULL DEFAULT 0,
  `account_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `amount` int(11) NOT NULL,
  `duration` int(11) NOT NULL,
  `payments` decimal(6,2) NOT NULL,
  `status` varchar(1) NOT NULL,
  PRIMARY KEY (`loan_id`),
  KEY `account_id` (`account_id`),
  CONSTRAINT `loan_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `account` (`account_id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci ROW_FORMAT=COMPACT;

CREATE TABLE `order` (
  `order_id` int(11) NOT NULL DEFAULT 0,
  `account_id` int(11) NOT NULL,
  `bank_to` varchar(2) NOT NULL,
  `account_to` int(11) NOT NULL,
  `amount` decimal(6,1) NOT NULL,
  `k_symbol` varchar(8) NOT NULL,
  PRIMARY KEY (`order_id`),
  KEY `account_id` (`account_id`),
  CONSTRAINT `order_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `account` (`account_id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci ROW_FORMAT=COMPACT;

CREATE TABLE `trans` (
  `trans_id` int(11) NOT NULL DEFAULT 0,
  `account_id` int(11) NOT NULL DEFAULT 0,
  `date` date NOT NULL,
  `type` varchar(6) NOT NULL,
  `operation` varchar(14) DEFAULT NULL,
  `amount` int(11) NOT NULL,
  `balance` int(11) NOT NULL,
  `k_symbol` varchar(11) DEFAULT NULL,
  `bank` varchar(2) DEFAULT NULL,
  `account` int(11) unsigned DEFAULT NULL,
  PRIMARY KEY (`trans_id`),
  KEY `account_id` (`account_id`),
  CONSTRAINT `trans_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `account` (`account_id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci ROW_FORMAT=COMPACT;

SET FOREIGN_KEY_CHECKS=1;
