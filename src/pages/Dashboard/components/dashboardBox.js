import { BsThreeDotsVertical } from "react-icons/bs";
import Button from '@mui/material/Button';
import { GiBookshelf } from "react-icons/gi";
import { RiPoliceBadgeFill } from "react-icons/ri";
import { MdTour } from "react-icons/md";
import { FaComputer } from "react-icons/fa6";
import { PiComputerTowerFill } from "react-icons/pi";
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import React,{ useState } from "react";
import { TbCircleNumber1Filled } from "react-icons/tb";
import { TbCircleNumber2Filled } from "react-icons/tb";
import { TbCircleNumber3Filled } from "react-icons/tb";
import { TbCircleNumber4Filled } from "react-icons/tb";

const DashboardBox = (props) => {

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const ITEM_HEIGHT = 48;

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Button
      className="dashboardBox"
      style={{
        backgroundImage: `linear-gradient(to right, ${props.color?.[0]}, ${props.color?.[1]})`, 
      }}>

        
        {props.grow === "true" && <span className="backlogo"><GiBookshelf/></span>}
        {props.grow === "extra" && <span className="backlogo"><MdTour/></span>}
        {props.grow === "medium" && <span className="backlogo"><FaComputer/></span>}
        {props.grow === "false" && <span className="backlogo"><RiPoliceBadgeFill/></span>}
        {props.grow === "small" && <span className="backlogo"><PiComputerTowerFill/></span>}
        

        <div className="d-flex w-100">
          <div className="col1">
            <h4 className="text-white mb-0">{props.title}</h4>
            <span className="text-white">{props.value}</span>
          </div>

          <div className="ml-auto">
            {
              props.icon ?
              <span className="icon">
                {props.icon ? props.icon : ''}
              </span>

              :

              ''
            }
            
          </div>
        </div>

        <div className="d-flex align-items-center w-100 bottomEle">
          <h6 className="text-white mb-0 mt-0">Last Academic Year</h6>
          <div className="ml-auto">
            <Button className="toggleIcon" onClick={handleClick} ><BsThreeDotsVertical/>
            </Button>

            
            <Menu
            className="year_dropdown"
            MenuListProps={{
              'aria-labelledby': 'long-button',
            }}
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            PaperProps={{
              style: {
                maxHeight: ITEM_HEIGHT * 4.5,
                width: '20ch',
              },
            }}
          >
            
              <MenuItem onClick={handleClose}>
                <TbCircleNumber1Filled/> 1st Year
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <TbCircleNumber2Filled/> 2nd Year
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <TbCircleNumber3Filled/> 3rd Year
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <TbCircleNumber4Filled/> 4th Year
              </MenuItem>
            
          </Menu>
          </div>
        </div>

    </Button>
  );
};

export default DashboardBox;